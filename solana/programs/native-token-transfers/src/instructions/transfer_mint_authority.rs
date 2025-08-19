use anchor_lang::prelude::*;
use anchor_spl::{token_2022::spl_token_2022::instruction::AuthorityType, token_interface};

use crate::
    config::*
;

#[derive(Accounts)]
#[instruction(args: TransferMintAuthorityArgs)]
pub struct TransferMintAuthority<'info> {
    pub payer: Signer<'info>,

    pub config: Account<'info, Config>,

    #[account(
        seeds = [crate::TOKEN_AUTHORITY_SEED],
        bump,
    )]
    /// CHECK: The seeds constraint ensures that this is the correct address
    pub token_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        address = config.mint,
    )]
    /// CHECK: the mint address matches the config
    pub mint: InterfaceAccount<'info, token_interface::Mint>,

    pub token_program: Interface<'info, token_interface::TokenInterface>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct TransferMintAuthorityArgs {
    pub new_mint_authority: Pubkey,
}

pub fn transfer_mint_authority<'info>(
    ctx: Context<'_, '_, '_, 'info, TransferMintAuthority<'info>>,
    args: TransferMintAuthorityArgs,
) -> Result<()> {
    assert!(ctx.accounts.config.owner == ctx.accounts.payer.key(), "Only the owner can transfer the mint authority");
    
    token_interface::set_authority(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), 
        token_interface::SetAuthority {
            current_authority: ctx.accounts.token_authority.to_account_info(),
            account_or_mint: ctx.accounts.mint.to_account_info(),
        },
        &[&[
            crate::TOKEN_AUTHORITY_SEED,
            &[ctx.bumps.token_authority],
        ]],
        ),
        AuthorityType::MintTokens,
        Some(args.new_mint_authority),
    )?;

    Ok(())
}
