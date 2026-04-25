import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const config = new pulumi.Config();
const projectName = "hazina-escrow";
const environment = pulumi.getStack();

// 1. Networking (VPC)
const vpc = new awsx.ec2.Vpc(`${projectName}-vpc`, {
    numberOfAvailabilityZones: 2,
    tags: { Project: projectName, Environment: environment },
});

// 2. Storage (EFS)
const efsFileSystem = new aws.efs.FileSystem(`${projectName}-efs`, {
    encrypted: true,
    tags: { Name: `${projectName}-efs` },
});

const efsSg = new aws.ec2.SecurityGroup(`${projectName}-efs-sg`, {
    vpcId: vpc.vpcId,
    ingress: [{
        protocol: "tcp",
        fromPort: 2049,
        toPort: 2049,
        cidrBlocks: ["0.0.0.0/0"], // Restrict to VPC CIDR in production
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

// Mount targets for EFS
const mountTargets = vpc.privateSubnetIds.then(ids => 
    ids.map((id, index) => new aws.efs.MountTarget(`${projectName}-mt-${index}`, {
        fileSystemId: efsFileSystem.id,
        subnetId: id,
        securityGroups: [efsSg.id],
    }))
);

// 3. Compute (ECS Fargate)
const cluster = new aws.ecs.Cluster(`${projectName}-cluster`);

const repo = new aws.ecr.Repository(`${projectName}-backend`, {
    forceDelete: true,
});

const logGroup = new aws.cloudwatch.LogGroup(`/ecs/${projectName}-backend`, {
    retentionInDays: 7,
});

const alb = new awsx.lb.ApplicationLoadBalancer(`${projectName}-alb`, {
    subnetIds: vpc.publicSubnetIds,
});

const targetGroup = alb.createTargetGroup(`${projectName}-tg`, {
    port: 3001,
    protocol: "HTTP",
    targetType: "ip",
    healthCheck: { path: "/health" },
});

const listener = alb.createListener(`${projectName}-listener`, {
    port: 80,
    defaultAction: {
        type: "forward",
        targetGroupArn: targetGroup.targetGroup.arn,
    },
});

const taskDefinition = new aws.ecs.TaskDefinition(`${projectName}-task`, {
    family: `${projectName}-backend`,
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: aws.iam.Role.get("ecsTaskExecutionRole", "arn:aws:iam::aws:role/service-role/AmazonECSTaskExecutionRolePolicy").arn, // Simplification
    containerDefinitions: pulumi.all([repo.repositoryUrl, efsFileSystem.id]).apply(([url, fsId]) => JSON.stringify([
        {
            name: "backend",
            image: `${url}:latest`,
            portMappings: [{ containerPort: 3001 }],
            environment: [
                { name: "PORT", value: "3001" },
                { name: "ANTHROPIC_API_KEY", value: config.requireSecret("anthropicApiKey") },
                { name: "ESCROW_WALLET", value: config.require("escrowWallet") },
                { name: "AGENT_WALLET_SECRET", value: config.requireSecret("agentWalletSecret") },
                { name: "ESCROW_CONTRACT_ID", value: config.get("escrowContractId") || "" },
                { name: "STELLAR_NETWORK", value: "testnet" }
            ],
            mountPoints: [{
                sourceVolume: "data",
                containerPath: "/app/data",
                readOnly: false,
            }],
            logConfiguration: {
                logDriver: "awslogs",
                options: {
                    "awslogs-group": logGroup.name,
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "ecs",
                },
            },
        }
    ])),
    volumes: [{
        name: "data",
        efsVolumeConfiguration: {
            fileSystemId: efsFileSystem.id,
            rootDirectory: "/",
        },
    }],
});

const service = new aws.ecs.Service(`${projectName}-service`, {
    cluster: cluster.arn,
    taskDefinition: taskDefinition.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        subnets: vpc.privateSubnetIds,
        securityGroups: [alb.loadBalancer.securityGroups[0]], // Simplification
        assignPublicIp: false,
    },
    loadBalancers: [{
        targetGroupArn: targetGroup.targetGroup.arn,
        containerName: "backend",
        containerPort: 3001,
    }],
});

// 4. Frontend (S3 + CloudFront)
const siteBucket = new aws.s3.Bucket(`${projectName}-frontend`, {
    forceDestroy: true,
});

const originAccessIdentity = new aws.cloudfront.OriginAccessIdentity(`${projectName}-oai`);

const siteBucketPolicy = new aws.s3.BucketPolicy(`${projectName}-bucket-policy`, {
    bucket: siteBucket.id,
    policy: pulumi.all([siteBucket.arn, originAccessIdentity.iamArn]).apply(([arn, iamArn]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: { AWS: iamArn },
            Action: "s3:GetObject",
            Resource: `${arn}/*`,
        }],
    })),
});

const cdn = new aws.cloudfront.Distribution(`${projectName}-cdn`, {
    enabled: true,
    defaultRootObject: "index.html",
    origins: [{
        domainName: siteBucket.bucketRegionalDomainName,
        originId: siteBucket.arn,
        s3OriginConfig: {
            originAccessIdentity: originAccessIdentity.cloudfrontAccessIdentityPath,
        },
    }],
    defaultCacheBehavior: {
        targetOriginId: siteBucket.arn,
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD"],
        forwardedValues: {
            queryString: false,
            cookies: { forward: "none" },
        },
        minTtl: 0,
        defaultTtl: 3600,
        maxTtl: 86400,
    },
    restrictions: {
        geoRestriction: { restrictionType: "none" },
    },
    viewerCertificate: {
        cloudfrontDefaultCertificate: true,
    },
});

// Outputs
export const backendUrl = alb.loadBalancer.dnsName;
export const frontendUrl = cdn.domainName;
export const s3BucketName = siteBucket.id;
export const ecrRepoUrl = repo.repositoryUrl;
