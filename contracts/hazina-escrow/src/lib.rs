#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String,
};

// ─── Storage keys ───────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    PlatformFee,    // basis points (500 = 5%)
    EscrowCount,
}

#[contracttype]
pub enum EscrowKey {
    Record(u64),    // escrow_id → EscrowRecord
}

// ─── Data types ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct EscrowRecord {
    pub escrow_id:  u64,
    pub dataset_id: String,     // e.g. "ds-003-defi-yields"
    pub buyer:      Address,
    pub seller:     Address,
    pub amount:     i128,       // USDC amount in stroops (7 decimals)
    pub token:      Address,    // USDC contract address
    pub released:   bool,
    pub refunded:   bool,
}

// ─── Contract ───────────────────────────────────────────────────────────────

#[contract]
pub struct HazinaEscrow;

#[contractimpl]
impl HazinaEscrow {

    /// One-time initialisation. Call after deployment.
    pub fn initialize(env: Env, admin: Address, platform_fee_bps: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialised");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PlatformFee, &platform_fee_bps);
        env.storage().instance().set(&DataKey::EscrowCount, &0u64);
    }

    /// Buyer calls this to lock tokens in escrow for a dataset query.
    /// Supports any token on Stellar (USDC, XLM, EURC, etc.).
    /// Returns the escrow_id the buyer must share with the backend.
    ///
    /// # Arguments
    /// * `buyer` - The account locking funds
    /// * `seller` - The account that will receive funds if released
    /// * `token` - The token contract address (supports any SPL/Stellar token)
    /// * `amount` - Token amount in the token's base unit (stroops for native assets, 7 decimals typically)
    /// * `dataset_id` - Human-readable dataset identifier for indexing
    pub fn lock(
        env:        Env,
        buyer:      Address,
        seller:     Address,
        token:      Address,
        amount:     i128,
        dataset_id: String,
    ) -> u64 {
        buyer.require_auth();

        // Transfer USDC from buyer → this contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);

        // Record escrow
        let id: u64 = env.storage().instance().get(&DataKey::EscrowCount).unwrap_or(0);
        let record = EscrowRecord {
            escrow_id: id,
            dataset_id,
            buyer: buyer.clone(),
            seller: seller.clone(),
            amount,
            token: token.clone(),
            released: false,
            refunded: false,
        };
        env.storage().persistent().set(&EscrowKey::Record(id), &record);
        env.storage().instance().set(&DataKey::EscrowCount, &(id + 1));

        // Emit event so the backend can index it
        env.events().publish(
            (soroban_sdk::symbol_short!("locked"),),
            (id, buyer, seller, amount),
        );

        id
    }

    /// Admin (Hazina backend) calls this after verifying the data was delivered.
    /// Sends 95% to seller and 5% to admin (platform fee).
    pub fn release(env: Env, admin: Address, escrow_id: u64) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut record: EscrowRecord = env
            .storage()
            .persistent()
            .get(&EscrowKey::Record(escrow_id))
            .expect("escrow not found");

        assert!(!record.released, "already released");
        assert!(!record.refunded, "already refunded");

        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PlatformFee)
            .unwrap_or(500);

        let platform_cut = record.amount * fee_bps as i128 / 10_000;
        let seller_cut   = record.amount - platform_cut;

        let token_client = token::Client::new(&env, &record.token);
        token_client.transfer(&env.current_contract_address(), &record.seller, &seller_cut);
        token_client.transfer(&env.current_contract_address(), &admin, &platform_cut);

        record.released = true;
        env.storage().persistent().set(&EscrowKey::Record(escrow_id), &record);

        env.events().publish(
            (soroban_sdk::symbol_short!("released"),),
            (escrow_id, record.seller, seller_cut, platform_cut),
        );
    }

    /// Admin can refund buyer if something goes wrong.
    pub fn refund(env: Env, admin: Address, escrow_id: u64) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut record: EscrowRecord = env
            .storage()
            .persistent()
            .get(&EscrowKey::Record(escrow_id))
            .expect("escrow not found");

        assert!(!record.released, "already released");
        assert!(!record.refunded, "already refunded");

        let token_client = token::Client::new(&env, &record.token);
        token_client.transfer(&env.current_contract_address(), &record.buyer, &record.amount);

        record.refunded = true;
        env.storage().persistent().set(&EscrowKey::Record(escrow_id), &record);

        env.events().publish(
            (soroban_sdk::symbol_short!("refunded"),),
            (escrow_id, record.buyer, record.amount),
        );
    }

    /// Read an escrow record.
    pub fn get_escrow(env: Env, escrow_id: u64) -> EscrowRecord {
        env.storage()
            .persistent()
            .get(&EscrowKey::Record(escrow_id))
            .expect("escrow not found")
    }

    /// Read current platform fee in basis points.
    pub fn get_fee(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::PlatformFee).unwrap_or(500)
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    fn assert_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialised");
        assert!(admin == *caller, "not admin");
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{Client as TokenClient, StellarAssetClient},
        Env, String,
    };

    fn setup() -> (Env, HazinaEscrowClient<'static>, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let admin  = Address::generate(&env);
        let buyer  = Address::generate(&env);
        let seller = Address::generate(&env);

        // Deploy a mock USDC token
        let token_id = env.register_stellar_asset_contract_v2(admin.clone());
        let usdc = token_id.address();
        let usdc_admin = StellarAssetClient::new(&env, &usdc);
        usdc_admin.mint(&buyer, &1_000_0000000); // 1000 USDC (7 decimal places)

        // Deploy escrow contract
        let contract_id = env.register(HazinaEscrow, ());
        let client = HazinaEscrowClient::new(&env, &contract_id);
        client.initialize(&admin, &500); // 5% fee

        (env, client, admin, buyer, seller, usdc)
    }

    #[test]
    fn test_lock_and_release() {
        let (env, client, admin, buyer, seller, usdc) = setup();
        let token_client = TokenClient::new(&env, &usdc);

        let amount: i128 = 2_000_000; // 0.2 USDC
        let dataset_id = String::from_str(&env, "ds-003-defi-yields");

        // Lock funds
        let escrow_id = client.lock(&buyer, &seller, &usdc, &amount, &dataset_id);
        assert_eq!(escrow_id, 0);
        assert_eq!(token_client.balance(&buyer), 1_000_0000000 - amount);

        // Release → seller gets 95%, admin gets 5%
        client.release(&admin, &escrow_id);

        let seller_expected = amount * 95 / 100;
        let admin_expected  = amount - seller_expected;
        assert_eq!(token_client.balance(&seller), seller_expected);
        assert_eq!(token_client.balance(&admin),  admin_expected);
    }

    #[test]
    fn test_refund() {
        let (env, client, admin, buyer, _seller, usdc) = setup();
        let token_client = TokenClient::new(&env, &usdc);
        let amount: i128 = 5_000_000; // 0.5 USDC

        let id = client.lock(
            &buyer, &Address::generate(&env), &usdc, &amount,
            &String::from_str(&env, "ds-001"),
        );
        client.refund(&admin, &id);

        // Buyer gets full refund
        assert_eq!(token_client.balance(&buyer), 1_000_0000000);
    }

    #[test]
    fn test_multi_token_support() {
        let env = Env::default();
        env.mock_all_auths();

        let admin  = Address::generate(&env);
        let buyer  = Address::generate(&env);
        let seller = Address::generate(&env);

        // Deploy contract
        let contract_id = env.register(HazinaEscrow, ());
        let client = HazinaEscrowClient::new(&env, &contract_id);
        client.initialize(&admin, &500);

        // Deploy multiple token types
        let usdc_id = env.register_stellar_asset_contract_v2(admin.clone());
        let usdc = usdc_id.address();
        let usdc_admin = StellarAssetClient::new(&env, &usdc);
        usdc_admin.mint(&buyer, &1_000_0000000);

        let eurc_id = env.register_stellar_asset_contract_v2(admin.clone());
        let eurc = eurc_id.address();
        let eurc_admin = StellarAssetClient::new(&env, &eurc);
        eurc_admin.mint(&buyer, &500_0000000); // 500 EURC

        // Test escrow with USDC
        let usdc_amount: i128 = 1_000_000;
        let usdc_escrow_id = client.lock(
            &buyer, &seller, &usdc, &usdc_amount,
            &String::from_str(&env, "ds-usd-yields"),
        );

        // Test escrow with EURC
        let eurc_amount: i128 = 500_000;
        let eurc_escrow_id = client.lock(
            &buyer, &seller, &eurc, &eurc_amount,
            &String::from_str(&env, "ds-eur-yields"),
        );

        // Verify both escrows exist independently
        let usdc_record = client.get_escrow(&usdc_escrow_id);
        assert_eq!(usdc_record.token, usdc);
        assert_eq!(usdc_record.amount, usdc_amount);

        let eurc_record = client.get_escrow(&eurc_escrow_id);
        assert_eq!(eurc_record.token, eurc);
        assert_eq!(eurc_record.amount, eurc_amount);

        // Release USDC escrow
        client.release(&admin, &usdc_escrow_id);
        let usdc_token_client = TokenClient::new(&env, &usdc);
        let usdc_seller_expected = usdc_amount * 95 / 100;
        assert_eq!(usdc_token_client.balance(&seller), usdc_seller_expected);

        // Release EURC escrow
        client.release(&admin, &eurc_escrow_id);
        let eurc_token_client = TokenClient::new(&env, &eurc);
        let eurc_seller_expected = eurc_amount * 95 / 100;
        assert_eq!(eurc_token_client.balance(&seller), eurc_seller_expected);
    }
}
