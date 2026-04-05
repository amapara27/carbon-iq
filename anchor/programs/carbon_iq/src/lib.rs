use anchor_lang::prelude::*;

declare_id!("CarbonIQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod carbon_iq {
    use super::*;

    /// Records an on-chain proof of environmental impact.
    /// Called after the backend verifies a user's carbon offset action.
    pub fn record_impact(
        ctx: Context<RecordImpact>,
        co2_offset_amount: u64,
    ) -> Result<()> {
        let proof = &mut ctx.accounts.proof_of_impact;
        let clock = Clock::get()?;

        proof.user_wallet = ctx.accounts.user.key();
        proof.co2_offset_amount = co2_offset_amount;
        proof.timestamp = clock.unix_timestamp;
        proof.bump = ctx.bumps.proof_of_impact;

        msg!(
            "🌱 Impact recorded: {} grams CO₂ offset by {}",
            co2_offset_amount,
            ctx.accounts.user.key()
        );

        emit!(ImpactRecorded {
            user_wallet: ctx.accounts.user.key(),
            co2_offset_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Allows a user to update an existing proof (e.g., accumulate offsets).
    pub fn update_impact(
        ctx: Context<UpdateImpact>,
        additional_offset: u64,
    ) -> Result<()> {
        let proof = &mut ctx.accounts.proof_of_impact;
        let clock = Clock::get()?;

        proof.co2_offset_amount = proof
            .co2_offset_amount
            .checked_add(additional_offset)
            .ok_or(ErrorCode::Overflow)?;
        proof.timestamp = clock.unix_timestamp;

        msg!(
            "🌱 Impact updated: total {} grams CO₂ offset by {}",
            proof.co2_offset_amount,
            ctx.accounts.user.key()
        );

        emit!(ImpactRecorded {
            user_wallet: ctx.accounts.user.key(),
            co2_offset_amount: proof.co2_offset_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct RecordImpact<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + ProofOfImpact::INIT_SPACE,
        seeds = [b"proof", user.key().as_ref()],
        bump,
    )]
    pub proof_of_impact: Account<'info, ProofOfImpact>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateImpact<'info> {
    #[account(
        mut,
        seeds = [b"proof", user.key().as_ref()],
        bump = proof_of_impact.bump,
    )]
    pub proof_of_impact: Account<'info, ProofOfImpact>,

    #[account(mut)]
    pub user: Signer<'info>,
}

// ─── State ───────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct ProofOfImpact {
    /// The wallet that performed the offset action.
    pub user_wallet: Pubkey, // 32 bytes
    /// Grams of CO₂ offset.
    pub co2_offset_amount: u64, // 8 bytes
    /// Unix timestamp of the last recorded action.
    pub timestamp: i64, // 8 bytes
    /// PDA bump seed.
    pub bump: u8, // 1 byte
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[event]
pub struct ImpactRecorded {
    pub user_wallet: Pubkey,
    pub co2_offset_amount: u64,
    pub timestamp: i64,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow when accumulating offset.")]
    Overflow,
}
