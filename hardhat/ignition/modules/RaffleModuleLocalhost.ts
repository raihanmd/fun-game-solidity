import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ChainlinkMockModule } from "./depedency/ChainlinkMockModule.js";
import { LinkTokenModule } from "./depedency/LinkTokenModule.js";
import { FUND_AMOUNT } from "./depedency/_const.js";

export default buildModule("RaffleModuleLocalhost", (m) => {
  const deployer = m.getAccount(0);

  const entranceFee = m.getParameter("entranceFee", "100000000000000");
  const interval = m.getParameter("interval", "86400");
  const keyHash = m.getParameter(
    "keyHash",
    "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"
  );
  const callbackGasLimit = m.getParameter("callbackGasLimit", "500000");

  const { vrfCoordinator } = m.useModule(ChainlinkMockModule);
  const { linkToken } = m.useModule(LinkTokenModule);

  // Create subscription
  const createSubscriptionFuture = m.call(
    vrfCoordinator,
    "createSubscription",
    [],
    {
      after: [vrfCoordinator, linkToken],
    }
  );

  const subId = m.readEventArgument(
    createSubscriptionFuture,
    "SubscriptionCreated",
    "subId"
  );

  // Fund subscription - gunakan transfer biasa lalu fundSubscription
  const transferFuture = m.call(
    linkToken,
    "transfer",
    [vrfCoordinator, FUND_AMOUNT],
    {
      from: deployer,
      after: [createSubscriptionFuture],
    }
  );

  const fundSubscriptionFuture = m.call(
    vrfCoordinator,
    "fundSubscription",
    [subId, FUND_AMOUNT],
    {
      from: deployer,
      after: [transferFuture],
    }
  );

  // Deploy Raffle
  const raffle = m.contract(
    "Raffle",
    [entranceFee, interval, vrfCoordinator, keyHash, subId, callbackGasLimit],
    {
      after: [fundSubscriptionFuture],
    }
  );

  // Add consumer
  // const addConsumerFuture = m.call(
  //   vrfCoordinator,
  //   "addConsumer",
  //   [subId, raffle],
  //   {
  //     from: deployer,
  //     after: [raffle],
  //   }
  // );

  return { raffle, vrfCoordinator };
});
