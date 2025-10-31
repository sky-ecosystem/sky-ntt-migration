export const NttManagerABI = [
    { "inputs": [], "name": "nextMessageSequence", "outputs": [{ "internalType": "uint64", "name": "", "type": "uint64" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getTransceivers", "outputs": [{ "internalType": "address[]", "name": "result", "type": "address[]" }], "stateMutability": "pure", "type": "function" },
] as const;


export const NttEvmTransceiverABI = [
    { "inputs": [], "name": "nttManagerToken", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "wormhole", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
] as const;

export const Erc20ABI = [
    { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
];