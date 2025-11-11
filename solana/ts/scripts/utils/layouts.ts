import { struct, u64 } from "@coral-xyz/borsh";

const SequenceTrackerLayout = struct([u64('sequence')]);

export { SequenceTrackerLayout };