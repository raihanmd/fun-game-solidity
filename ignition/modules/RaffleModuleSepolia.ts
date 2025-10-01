import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { FUND_AMOUNT } from "./depedency/_const.js";
import { encodeAbiParameters } from "viem";

const ENCODED_SUB_ID = encodeAbiParameters(
  [{ type: "uint256" }],
  [
    74229658597778471823553668351449848182860044837466327382704763303783947320514n,
  ]
);

export default buildModule("RaffleModuleSepolia", (m) => {
  const deployer = m.getAccount(0);

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
  const linkContractAddress = m.getParameter(
    "linkContractAddress",
    "0x779877A7B0D9E8603169DdbD7836e478b4624789"
  );

  const linkContract = m.contractAt("LinkToken", linkContractAddress);

  const data = m.encodeFunctionCall(linkContract, "transferAndCall", [
    vrfCoordinatorAddress,
    FUND_AMOUNT.toString(),
    ENCODED_SUB_ID,
  ]);

  // const myContract = m.contract("MyContract");
  // const data = m.encodeFunctionCall(myContract, "updateCounter", [100]);
  // m.send("callUpdateCounter", myContract, 0n, data);

  m.send("callTransferAndCall", linkContract, 0n, data, {
    from: deployer,
  });

  // m.call(
  //   linkContract,
  //   "transferAndCall",
  //   [vrfCoordinatorAddress, FUND_AMOUNT.toString(), ENCODED_SUB_ID],
  //   {
  //     from: deployer,
  //   }
  // );

  const raffle = m.contract(
    "Raffle",
    [
      entranceFee,
      interval,
      vrfCoordinatorAddress,
      keyHash,
      subscriptionId,
      callbackGasLimit,
    ],
    {
      from: deployer,
    }
  );

  return { raffle };
});
