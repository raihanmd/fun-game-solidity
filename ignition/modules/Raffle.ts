import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RaffleModule", (m) => {
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const raffle = m.contract("Raffle", [1e18, oneDayInMilliseconds]);

  m.call(raffle, "", [5n]);

  return { raffle };
});
