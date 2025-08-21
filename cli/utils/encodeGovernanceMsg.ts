import * as bs58 from "bs58";

// Constants
const MODULE = "000000000000000047656e6572616c507572706f7365476f7665726e616e6365"; // "GeneralPurposeGovernance" (left padded)
const ACTION = "02"; // SOLANA CALL
const CHAIN = "0001"; // SOLANA CHAIN ID
const GOVERNED_PROGRAM_ID = "2c43318f0f99dfd8c0ebc65b0b23cc661fcd1df64af6aef33b7b83eca8e58197";
const DATA_LENGTH = "00000008";
const DATA = "afaf6d1f0d989bed"; // "Initialize" instruction data

function encodeGovernanceMsg(governanceProgramIdBase58: string): string {
    // Returns a governance message that calls the 'Initialize' instruction
    // in the Hello world program using the given governance program.
    try {
        const programIdBytes = bs58.decode(governanceProgramIdBase58);
        const programIdLen = programIdBytes.length;
        if (programIdLen !== 32) {
            throw new Error(`Invalid program ID length. Expected 32 bytes, got ${programIdLen}`);
        }
        const programIdHex = Buffer.from(programIdBytes).toString("hex");
        const governanceMsg =
            MODULE +
            ACTION +
            CHAIN +
            programIdHex +
            GOVERNED_PROGRAM_ID +
            DATA_LENGTH +
            DATA;
        return governanceMsg;
    } catch (e: any) {
        throw new Error(
            `Failed to decode governance program ID '${governanceProgramIdBase58}'. Error: ${e.message}`
        );
    }
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Error: missing 'governanceProgramId' parameter");
        return;
    }
    const governanceProgramId = args[0];
    try {
        const governanceMsg = encodeGovernanceMsg(governanceProgramId);
        console.log(governanceMsg);
    } catch (e: any) {
        console.error(`Failed to encode governance message. Error: ${e.message}`);
    }
}

if (require.main === module) {
    main();
}
