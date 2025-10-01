// scripts/debug-deployment.ts
import hre from "hardhat";
import { parseEther, formatEther, encodeAbiParameters } from "viem";

async function main() {
  const { viem } = await hre.network.connect({
    network: "sepolia",
  });
  console.log("=== Debugging Deployment Prerequisites ===\n");

  // Get public client
  const publicClient = await viem.getPublicClient();

  // Get wallet client
  const [deployer] = await viem.getWalletClients();
  console.log("1. Deployer Address:", deployer.account.address);

  // Check ETH balance
  const ethBalance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log("2. ETH Balance:", formatEther(ethBalance), "ETH");

  if (ethBalance < parseEther("0.01")) {
    console.error("❌ Insufficient ETH! Need at least 0.01 ETH for gas");
    return;
  }
  console.log("✅ ETH balance OK\n");

  // Check LINK balance
  const linkAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

  const linkBalance = await publicClient.readContract({
    address: linkAddress,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [deployer.account.address],
  });

  console.log("3. LINK Balance:", formatEther(linkBalance), "LINK");

  if (linkBalance < parseEther("3")) {
    console.error("❌ Insufficient LINK! Need at least 3 LINK");
    console.log("Get LINK from: https://faucets.chain.link/sepolia");
    return;
  }
  console.log("✅ LINK balance OK\n");

  // Test encoding
  const subId = 123n; // ganti subscription ID kamu
  const encoded = encodeAbiParameters([{ type: "uint64" }], [subId]);
  console.log("4. Encoded Subscription ID:", encoded);
  console.log("✅ Encoding works\n");

  // Test transferAndCall simulation
  const vrfAddress = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";

  console.log("5. Testing transferAndCall simulation...");
  try {
    await publicClient.simulateContract({
      address: linkAddress,
      abi: [
        {
          name: "transferAndCall",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" },
          ],
          outputs: [{ type: "bool" }],
        },
      ],
      functionName: "transferAndCall",
      args: [vrfAddress, parseEther("3"), encoded],
      account: deployer.account,
    });
    console.log("✅ transferAndCall simulation SUCCESS!\n");
  } catch (error: any) {
    console.error("❌ transferAndCall simulation FAILED:");
    console.error(error.message);
    console.error("\nFull error:", error);
    return;
  }

  console.log("=== All Checks Passed! Ready to Deploy ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
