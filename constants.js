import * as dotenv from 'dotenv'
dotenv.config()

export const constants = {
    sponserKey: process.env.PRIVATE_KEY,
    victimKey: process.env.VICTIM_KEY,
    tokenAddress: "TOKEN_ADDRESS",
    rpc: process.env.RPC
}