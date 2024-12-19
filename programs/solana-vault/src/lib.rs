use anchor_lang::prelude::*;

declare_id!("EvdLWk84s1qQxTgKE7afWcr1oKdwjD5HhsDCxk6kM1wj");

#[program]
pub mod solana_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
