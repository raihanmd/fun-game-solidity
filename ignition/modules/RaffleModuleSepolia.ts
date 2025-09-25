import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RaffleModule", (m) => {
  const entranceFee = m.getParameter("entranceFee", "100000000000000");
  const interval = m.getParameter("interval", "86400");
  const keyHash = m.getParameter(
    "keyHash",
    "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
  );
  const subscriptionId = m.getParameter(
    "subscriptionId",
    "74229658597778471823553668351449848182860044837466327382704763303783947320514"
  );
  const callbackGasLimit = m.getParameter("callbackGasLimit", "500000");
  const vrfCoordinatorAddress = m.getParameter(
    "vrfCoordinatorAddress",
    "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"
  );

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
