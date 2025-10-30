import { array, publicKey, struct, u16, u64, u8 } from "@coral-xyz/borsh";

const SequenceTrackerLayout = struct([u64('sequence')]);
const RegisteredTransceiverLayout = struct([u64('discriminator'), u8('bump'), u8('id'), publicKey('transceiverAddress')]);
const ChainIDLayout = struct([u16('id')]);
const TrimmedAmountLayout = struct([
  u64('amount'),
  u8('decimals')
]);
const NativeTokenTransferLayout = struct([
  TrimmedAmountLayout.replicate('amount'),
  array(u8(), 32, 'source_token'),
  array(u8(), 32, 'to'),
  ChainIDLayout.replicate('to_chain')
]);
const NttManagerMessageLayout = struct([
  array(u8(), 32, 'id'),
  array(u8(), 32, 'sender'),
  NativeTokenTransferLayout.replicate('payload')
]);
const TransceiverMessageDataLayout = struct([
  array(u8(), 32, 'source_ntt_manager'),
  array(u8(), 32, 'recipient_ntt_manager'),
  NttManagerMessageLayout.replicate('ntt_manager_payload')
]);

const ValidatedTransceiverMessageLayout = struct([
  u64('discriminator'),
  ChainIDLayout.replicate('from_chain'),
  TransceiverMessageDataLayout.replicate('message')
]);

export { SequenceTrackerLayout, RegisteredTransceiverLayout, ChainIDLayout, TrimmedAmountLayout, NativeTokenTransferLayout, NttManagerMessageLayout, TransceiverMessageDataLayout, ValidatedTransceiverMessageLayout };