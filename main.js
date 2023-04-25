import { ethers, providers, Wallet, utils, BigNumber } from 'ethers'
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle'
import { FlashbotsBundleResolution } from '@flashbots/ethers-provider-bundle'
import { exit } from 'process'
import { constants } from './constants.js'

const flashbotRelayUrls = {
	mainnet: 'https://relay.flashbots.net',
	goerli: 'https://relay-goerli.flashbots.net',
	sepolia: 'https://relay-sepolia.flashbots.net',
}

const main = async () => {
	const provider = new providers.JsonRpcProvider(rpc)
	const authSigner = Wallet.createRandom()
	const sponserWallet = new Wallet(constants.sponserKey, provider)
	const victimWallet = new Wallet(constants.victimKey, provider)

	const abi = ['function transfer(address,uint256) external']
	const iface = new utils.Interface(abi)

	const flashbotsProvider = await FlashbotsBundleProvider.create(
		provider,
		authSigner,
		flashbotRelayUrls.mainnet
	)

	provider.on('block', async (blockNumber) => {
		console.log(blockNumber)
		let targetBlockNumber = blockNumber + 1

		try {
			const signedBundle = await flashbotsProvider.signBundle([
				{
					signer: sponserWallet,
					transaction: {
						to: victimWallet.address,
						gasLimit: '21000',
						type: 2,
						chainId: 1,
						value: utils
							.parseUnits('36', 'gwei')
							.mul(BigNumber.from(60000)),
						maxFeePerGas: utils.parseUnits('36', 'gwei'),
						maxPriorityFeePerGas: utils.parseUnits('0.1', 'gwei'),
					},
				},
				{
					signer: victimWallet,
					transaction: {
						to: constants.tokenAddress,
						type: 2,
						chainId: 1,
						maxFeePerGas: utils.parseUnits('36', 'gwei'),
						maxPriorityFeePerGas: utils.parseUnits('0.1', 'gwei'),
						gasLimit: '60000',
						data: iface.encodeFunctionData('transfer', [
							sponserWallet.address,
							utils.parseUnits('10', 6),
						]),
						value: BigNumber.from(0),
					},
				},
			])

			// To only simulate the bundle transaction and not send a live transaction uncomment the below code
			// const simulatedReceipt = await flashbotsProvider.simulate(
			// 	signedBundle,
			// 	targetBlockNumber + 1
			// )
			// console.log(simulatedReceipt)
			// return

			// sends the bundle transaction
			const bundleReceipt = await flashbotsProvider.sendRawBundle(
				signedBundle,
				targetBlockNumber
			)

			if ('error' in bundleReceipt) {
				console.log(bundleReceipt.error.message)
				return
			}

			const resolution = await bundleReceipt.wait()
			if (resolution === FlashbotsBundleResolution.BundleIncluded) {
				console.log(
					`bundle included in blockNumber ${targetBlockNumber}`
				)
				exit(0)
			} else if (
				resolution ===
				FlashbotsBundleResolution.BlockPassedWithoutInclusion
			) {
				console.log('bundle not included in target block')
			} else if (
				resolution === FlashbotsBundleResolution.AccountNonceTooHigh
			) {
				console.log('Account nonce too high')
				exit(1)
			}
		} catch (error) {
			console.log(error)
		}
	})
}

main()
