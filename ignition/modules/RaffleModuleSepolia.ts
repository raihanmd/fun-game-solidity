import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RaffleModule", (m) => {
  const entranceFee = m.getParameter("entranceFee");
  const interval = m.getParameter("interval");
  const keyHash = m.getParameter("keyHash");
  const subscriptionId = m.getParameter("subscriptionId");
  const callbackGasLimit = m.getParameter("callbackGasLimit");
  const vrfCoordinatorAddress = m.getParameter("vrfCoordinatorAddress");

  const raffle = m.contract("Raffle", [
    entranceFee,
    interval,
    vrfCoordinatorAddress,
    keyHash,
    subscriptionId,
    callbackGasLimit,
  ]);

  return { raffle };
});
