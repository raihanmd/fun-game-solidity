import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const ChainlinkMockModule = buildModule("ChainlinkMockModule", (m) => {
  const mockBaseFee = m.getParameter("mockBaseFee", "100000000000000000");
  const mockGasPrice = m.getParameter("mockGasPrice", "1000000000");
  const mockWeiPerUintLink = m.getParameter(
    "mockWeiPerUintLink",
    "4000000000000000"
  );

  const vrfCoordinator = m.contract("VRFCoordinatorV2_5Mock", [
    mockBaseFee,
    mockGasPrice,
    mockWeiPerUintLink,
  ]);

  return { vrfCoordinator };
});
