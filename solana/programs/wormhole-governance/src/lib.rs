use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;

use instructions::*;

declare_id!("SCCGgsntaUPmP6UjwUBNiQQ83ys5fnCHdFASHPV6Fm9");

pub const GOV_AUTHORITY: [u8; 32] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xBE, 0x8E, 0x3e, 0x36,
    0x18, 0xf7, 0x47, 0x4F, 0x8c, 0xB1, 0xd0, 0x74, 0xA2, 0x6a, 0xfF, 0xef, 0x00, 0x7E, 0x98, 0xFB,
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
        "000000000000000000000000be8e3e3618f7474f8cb1d074a26affef007e98fb"
    )
}
