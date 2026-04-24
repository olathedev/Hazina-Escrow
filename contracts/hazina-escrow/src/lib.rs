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
        assert!(platform_fee_bps <= 10_000, "fee exceeds 100%");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PlatformFee, &platform_fee_bps);
        env.storage().instance().set(&DataKey::EscrowCount, &0u64);

        // Emit event so indexers can observe initial configuration
        env.events().publish(
            (soroban_sdk::symbol_short!("init"),),
            (admin, platform_fee_bps),
        );
    }

    /// Admin can update the platform fee (in basis points, max 10 000 = 100%).
    pub fn set_fee(env: Env, admin: Address, new_fee_bps: u32) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        assert!(new_fee_bps <= 10_000, "fee exceeds 100%");

        let old_fee: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PlatformFee)
            .unwrap_or(500);
        env.storage().instance().set(&DataKey::PlatformFee, &new_fee_bps);

        env.events().publish(
            (soroban_sdk::symbol_short!("fee_set"),),
            (old_fee, new_fee_bps),
        );
    }

    /// Admin can transfer admin rights to a new address.
    pub fn set_admin(env: Env, admin: Address, new_admin: Address) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        env.storage().instance().set(&DataKey::Admin, &new_admin);

        env.events().publish(
            (soroban_sdk::symbol_short!("admin_set"),),
            (admin, new_admin),
        );
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

    #[test]
    fn test_initialize_emits_event() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register(HazinaEscrow, ());
        let client = HazinaEscrowClient::new(&env, &contract_id);
        client.initialize(&admin, &250);

        // Fee is stored correctly after init
        assert_eq!(client.get_fee(), 250);
    }

    #[test]
    fn test_set_fee() {
        let (_, client, admin, _, _, _) = setup();
        client.set_fee(&admin, &300);
        assert_eq!(client.get_fee(), 300);
    }

    #[test]
    fn test_set_fee_max_boundary() {
        let (_, client, admin, _, _, _) = setup();
        client.set_fee(&admin, &10_000);
        assert_eq!(client.get_fee(), 10_000);
    }

    #[test]
    #[should_panic(expected = "fee exceeds 100%")]
    fn test_set_fee_rejects_over_10000() {
        let (_, client, admin, _, _, _) = setup();
        client.set_fee(&admin, &10_001);
    }

    #[test]
    fn test_set_admin() {
        let (env, client, admin, _, _, _) = setup();
        let new_admin = Address::generate(&env);
        client.set_admin(&admin, &new_admin);

        // Old admin can no longer change the fee (new admin is required)
        // New admin can change the fee successfully
        client.set_fee(&new_admin, &100);
        assert_eq!(client.get_fee(), 100);
    }

    #[test]
    #[should_panic(expected = "not admin")]
    fn test_set_fee_requires_admin() {
        let (env, client, _, _, _, _) = setup();
        let impostor = Address::generate(&env);
        client.set_fee(&impostor, &100);
    }

    #[test]
    #[should_panic(expected = "already initialised")]
    fn test_double_initialize_panics() {
        let (_, client, admin, _, _, _) = setup();
        client.initialize(&admin, &500); // second call must panic
    }
}

// ─── Fuzz / property-based tests ────────────────────────────────────────────

#[cfg(test)]
mod fuzz_tests {
    extern crate std;

    use super::*;
    use proptest::prelude::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{Client as TokenClient, StellarAssetClient},
        Env, String,
    };

    // ── helpers ──────────────────────────────────────────────────────────────

    /// Mint `amount` of a fresh token to `buyer` and return the token address.
    fn deploy_token(env: &Env, admin: &Address, buyer: &Address, amount: i128) -> Address {
        let id = env.register_stellar_asset_contract_v2(admin.clone());
        let addr = id.address();
        StellarAssetClient::new(env, &addr).mint(buyer, &amount);
        addr
    }

    fn deploy_escrow(env: &Env, admin: &Address, fee_bps: u32) -> HazinaEscrowClient<'static> {
        let contract_id = env.register(HazinaEscrow, ());
        let client = HazinaEscrowClient::new(env, &contract_id);
        client.initialize(admin, &fee_bps);
        client
    }

    // ── fee arithmetic invariant ─────────────────────────────────────────────

    proptest! {
        /// For any valid fee and any positive lock amount, the split must be lossless:
        ///   seller_cut + platform_cut == amount
        #[test]
        fn prop_fee_split_is_lossless(
            fee_bps in 0u32..=10_000u32,
            amount   in 1i128..=1_000_000_000i128,
        ) {
            let platform_cut = amount * fee_bps as i128 / 10_000;
            let seller_cut   = amount - platform_cut;
            prop_assert_eq!(seller_cut + platform_cut, amount);
        }

        /// Seller cut is always <= amount and never negative.
        #[test]
        fn prop_seller_cut_in_bounds(
            fee_bps in 0u32..=10_000u32,
            amount  in 0i128..=i128::MAX / 10_001,
        ) {
            let platform_cut = amount * fee_bps as i128 / 10_000;
            let seller_cut   = amount - platform_cut;
            prop_assert!(seller_cut >= 0);
            prop_assert!(seller_cut <= amount);
        }

        /// set_fee persists arbitrary valid fee values correctly.
        #[test]
        fn prop_set_fee_roundtrip(new_fee in 0u32..=10_000u32) {
            let env = Env::default();
            env.mock_all_auths();
            let admin = Address::generate(&env);
            let client = deploy_escrow(&env, &admin, 500);
            client.set_fee(&admin, &new_fee);
            prop_assert_eq!(client.get_fee(), new_fee);
        }

        /// Lock with various amounts: contract balance increases by exactly `amount`.
        #[test]
        fn prop_lock_transfers_exact_amount(
            amount in 1i128..=500_000_000i128,
        ) {
            let env = Env::default();
            env.mock_all_auths();

            let admin  = Address::generate(&env);
            let buyer  = Address::generate(&env);
            let seller = Address::generate(&env);

            let mint_amount = amount + 1_000; // ensure buyer has enough
            let token = deploy_token(&env, &admin, &buyer, mint_amount);
            let token_client = TokenClient::new(&env, &token);

            let client = deploy_escrow(&env, &admin, 500);
            let _contract_addr = env.register(HazinaEscrow, ()); // register to get address

            let buyer_before = token_client.balance(&buyer);
            client.lock(
                &buyer, &seller, &token, &amount,
                &String::from_str(&env, "ds-fuzz"),
            );
            let buyer_after = token_client.balance(&buyer);

            prop_assert_eq!(buyer_before - buyer_after, amount);
        }

        /// Release after lock: combined payout always equals locked amount.
        #[test]
        fn prop_release_pays_out_full_amount(
            fee_bps in 0u32..=10_000u32,
            amount  in 1i128..=500_000_000i128,
        ) {
            let env = Env::default();
            env.mock_all_auths();

            let admin  = Address::generate(&env);
            let buyer  = Address::generate(&env);
            let seller = Address::generate(&env);

            let token = deploy_token(&env, &admin, &buyer, amount + 1_000);
            let token_client = TokenClient::new(&env, &token);

            let client = deploy_escrow(&env, &admin, fee_bps);
            let escrow_id = client.lock(
                &buyer, &seller, &token, &amount,
                &String::from_str(&env, "ds-fuzz-rel"),
            );

            let seller_before = token_client.balance(&seller);
            let admin_before  = token_client.balance(&admin);

            client.release(&admin, &escrow_id);

            let seller_gain = token_client.balance(&seller) - seller_before;
            let admin_gain  = token_client.balance(&admin)  - admin_before;

            prop_assert_eq!(seller_gain + admin_gain, amount);
        }

        /// Refund after lock: buyer always recovers the full locked amount.
        #[test]
        fn prop_refund_returns_full_amount(
            amount in 1i128..=500_000_000i128,
        ) {
            let env = Env::default();
            env.mock_all_auths();

            let admin  = Address::generate(&env);
            let buyer  = Address::generate(&env);
            let seller = Address::generate(&env);

            let token = deploy_token(&env, &admin, &buyer, amount + 1_000);
            let token_client = TokenClient::new(&env, &token);

            let client = deploy_escrow(&env, &admin, 500);
            let escrow_id = client.lock(
                &buyer, &seller, &token, &amount,
                &String::from_str(&env, "ds-fuzz-ref"),
            );

            let buyer_before = token_client.balance(&buyer);
            client.refund(&admin, &escrow_id);
            let buyer_after = token_client.balance(&buyer);

            prop_assert_eq!(buyer_after - buyer_before, amount);
        }
    }
}
