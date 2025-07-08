import sys
import base58

MODULE = "000000000000000047656e6572616c507572706f7365476f7665726e616e6365"
ACTION = "02"
CHAIN = "0001"
GOVERNED_PROGRAM_ID = "2c43318f0f99dfd8c0ebc65b0b23cc661fcd1df64af6aef33b7b83eca8e58197"
DATA = "00000008afaf6d1f0d989bed"

def encode_governance_msg(governance_program_id_base58: str):
    try:
        program_id_bytes = base58.b58decode(governance_program_id_base58)
        program_id_len = len(program_id_bytes)
        if program_id_len != 32:
            raise Exception(f"Invalid program ID length. Expected 32 bytes, got {program_id_len}")
        
        program_id_hex = program_id_bytes.hex()
        governance_msg = MODULE + ACTION + CHAIN + program_id_hex + GOVERNED_PROGRAM_ID + DATA
        return governance_msg
    except Exception as e:
        raise Exception(f"Failed to decode governance program ID '{governance_program_id_base58}'. Error: {e}")
    
def main():
    try:
        governance_program_id = sys.argv[1]
    except IndexError:
        print("Error: missing 'governance_program_id' parameter")
        return
    try:
        governance_msg = encode_governance_msg(governance_program_id)
        print(governance_msg)
    except Exception as e:
        print(f"Failed to encode governance message. Error: {e}")


if __name__ == "__main__":
    main()
