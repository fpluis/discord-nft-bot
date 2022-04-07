import ethers from "ethers";
import { readFileSync } from "fs";
import { Client, Intents } from 'discord.js';

const { ETHERSCAN_API_KEY, DISCORD_BOT_TOKEN } = JSON.parse(readFileSync("secrets.json"));

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.login(DISCORD_BOT_TOKEN);

const {
  collectionAddress,
  openSeaAddress,
  channelId,
  network
} = JSON.parse(readFileSync("config.json"));

const openSeaAbi = JSON.parse(readFileSync("opensea-abi.json"));

const provider = ethers.getDefaultProvider(network, {
    etherscan: ETHERSCAN_API_KEY,
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  const announceSale = async (seller, buyer, price, tokenId) => {
    const channel = await client.channels.fetch(channelId);
    const looksrareLink = `https://looksrare.org/collections/${collectionAddress}/${tokenId}`;
    channel.send(`NEW SALE! Seller ${seller} sold to ${buyer} at price ${price}\n ${looksrareLink}`);
  };

  const contract = new ethers.Contract(openSeaAddress, openSeaAbi, provider);
  contract.on(contract.filters.OrdersMatched(), async (...args) => {
    const event = args[args.length - 1];
    const {
      args: { maker: seller, taker: buyer, price }
    } = event;
    const priceAsEth = ethers.utils.formatEther(price);
    const transactionReceipt = await event.getTransactionReceipt();
    const { logs: [firstLog] } = transactionReceipt;
    const { address, topics } = firstLog;
    const [, , , tokenIdHex] = topics;
    const tokenId = parseInt(Number(tokenIdHex));

    if (address === collectionAddress) {
      announceSale(seller, buyer, priceAsEth, tokenId);
    }
  })
});
