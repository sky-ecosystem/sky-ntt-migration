use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;

use instructions::*;

declare_id!("67Wtx1DsvHZtL8iMpaJceqnNrHQuoxHqd9pLRCMqFyFz");

pub const GOV_AUTHORITY: [u8; 32] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0xa6, 0xe2,
    0x79, 0x8f, 0x42, 0xc7, 0xf3, 0xc9, 0x72, 0x15, 0xdd, 0xf9, 0x58, 0xd5, 0x50, 0x0f, 0x8e, 0xc8,
];

#[program]
pub mod wormhole_governance {
    use super::*;

    pub fn governance<'info>(ctx: Context<'_, '_, '_, 'info, Governance<'info>>) -> Result<()> {
        instructions::governance(ctx)
    }
}

#[test]
fn authority_sanity() {
    let hex_string = hex::encode(GOV_AUTHORITY);

    assert_eq!(
        hex_string,
        "0000000000000000000000000804a6e2798f42c7f3c97215ddf958d5500f8ec8"
    )
}
