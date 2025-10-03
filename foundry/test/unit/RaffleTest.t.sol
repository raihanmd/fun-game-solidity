// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {DeployRaffle} from "../../script/DeployRaffle.s.sol";
import {Raffle} from "../../src/Raffle.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {LinkToken} from "../../test/mocks/LinkToken.sol";
import {CodeConstants} from "../../script/HelperConfig.s.sol";

contract RaffleTest is Test, CodeConstants {
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/
    event Raffle__RequestedRaffleWinner(uint256 indexed requestId);
    event Raffle__PlayerEnter(address indexed player);
    event Raffle__PlayerWinner(address indexed player);

    Raffle public raffle;
    HelperConfig public helperConfig;

    uint256 subscriptionId;
    bytes32 gasLane;
    uint256 automationUpdateInterval;
    uint256 raffleEntranceFee;
    uint32 callbackGasLimit;
    address vrfCoordinatorV2_5;
    LinkToken link;

    address public PLAYER = makeAddr("player");
    uint256 public constant STARTING_USER_BALANCE = 10 ether;
    uint256 public constant LINK_BALANCE = 100 ether;

    function setUp() external {
        DeployRaffle deployer = new DeployRaffle();
        (raffle, helperConfig) = deployer.run();
        vm.deal(PLAYER, STARTING_USER_BALANCE);

        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();
        subscriptionId = config.subscriptionId;
        gasLane = config.gasLane;
        automationUpdateInterval = config.automationUpdateInterval;
        raffleEntranceFee = config.raffleEntranceFee;
        callbackGasLimit = config.callbackGasLimit;
        vrfCoordinatorV2_5 = config.vrfCoordinatorV2_5;
        link = LinkToken(config.link);

        vm.startPrank(msg.sender);
        if (block.chainid == LOCAL_CHAIN_ID) {
            link.mint(msg.sender, LINK_BALANCE);
            VRFCoordinatorV2_5Mock(vrfCoordinatorV2_5).fundSubscription(
                subscriptionId,
                LINK_BALANCE
            );
        }
        link.approve(vrfCoordinatorV2_5, LINK_BALANCE);
        vm.stopPrank();
    }

    function testRaffleInitializesInOpenState() public view {
        assert(raffle.getRaffleState() == Raffle.RaffleState.OPEN);
    }

    /***************************************************************
                              ENTER RAFFLE
    ***************************************************************/
    function testRaffleRevertsWHenYouDontPayEnough() public {
        // Arrange
        vm.prank(PLAYER);
        // Act / Assert
        vm.expectRevert(Raffle.Raffle__NotEnoughEthSent.selector);
        raffle.enterRaffle();
    }

    function testRaffleRecordsPlayerWhenTheyEnter() public {
        vm.prank(PLAYER);

        raffle.enterRaffle{value: raffleEntranceFee}();

        address playerRecorded = raffle.getPlayer(0);
        assert(playerRecorded == PLAYER);
    }

    function testEmitsEventOnEntrance() public {
        vm.prank(PLAYER);

        vm.expectEmit(true, false, false, false, address(raffle));
        emit Raffle__PlayerEnter(PLAYER);
        raffle.enterRaffle{value: raffleEntranceFee}();
    }

    function testDontAllowPlayersToEnterWhileRaffleIsCalculating()
        public
        raffleEnter
    {
        raffle.performUpkeep("");

        vm.expectRevert(Raffle.Raffle__RaffleNotOpen.selector);
        vm.prank(PLAYER);
        raffle.enterRaffle{value: raffleEntranceFee}();
    }

    /***************************************************************
                              CHECKUPKEEP
    ***************************************************************/
    function testCheckUpKeepReturnsFalseIfItHasNoBalance() public {
        vm.warp(block.timestamp + automationUpdateInterval + 1);
        vm.roll(block.number + 1);

        (bool upkeepNeeded, ) = raffle.checkUpkeep("");

        assert(!upkeepNeeded);
    }

    function testCheckUpKeepReturnsFalseIfRaffleIsNotOpen() public raffleEnter {
        raffle.performUpkeep("");

        (bool upkeepNeeded, ) = raffle.checkUpkeep("");

        assert(!upkeepNeeded);
    }

    function testCheckUpKeepReturnsTrueIfParametersAreGood()
        public
        raffleEnter
    {
        (bool upkeepNeeded, ) = raffle.checkUpkeep("");

        assert(upkeepNeeded);
    }

    /***************************************************************
                              PERFORM UPKEEP
    ***************************************************************/
    function testPerformUpKeepRevertWhenNotNeeded() public {
        vm.warp(block.timestamp + automationUpdateInterval + 1);
        vm.roll(block.number + 1);

        uint256 contractBalance = address(raffle).balance;
        uint256 numPlayers = raffle.getPlayers().length;
        uint256 raffleState = uint256(raffle.getRaffleState());

        vm.expectRevert(
            abi.encodeWithSelector(
                Raffle.Raffle__UpkeepNotNeeded.selector,
                contractBalance,
                numPlayers,
                raffleState
            )
        );
        raffle.performUpkeep("");
    }

    function testPerformUpKeepCanOnlyRunIfCheckUpKeepIsTrue()
        public
        raffleEnter
    {
        raffle.performUpkeep("");
    }

    function testPerformUpkeepUpdatesRaffleStateAndEmitsRequestId()
        public
        raffleEnter
    {
        vm.recordLogs();
        raffle.performUpkeep("");

        Vm.Log[] memory entries = vm.getRecordedLogs();

        // * The first entries will be from the VRF
        // * The 0 topics is reserved idk what that mean, but thats not from our code made
        bytes32 requestId = entries[1].topics[1];

        Raffle.RaffleState raffleState = raffle.getRaffleState();
        assert(uint256(requestId) > 0);
        assert(raffleState == Raffle.RaffleState.CALCULATING);
    }

    modifier raffleEnter() {
        vm.prank(PLAYER);
        raffle.enterRaffle{value: raffleEntranceFee}();
        vm.warp(block.timestamp + automationUpdateInterval + 1);
        vm.roll(block.number + 1);
        _;
    }

    /***************************************************************
                            FULL FULL RANDOM WORDS
    ***************************************************************/
    // * NOTE foundry auto fuzz this test for us!
    function testFullFillRandomWordsCanOnlyBeCalledAfterPerformUpkeep(
        uint256 randomReqId
    ) public raffleEnter {
        vm.expectRevert(VRFCoordinatorV2_5Mock.InvalidRequest.selector);
        VRFCoordinatorV2_5Mock(vrfCoordinatorV2_5).fulfillRandomWords(
            randomReqId,
            address(raffle)
        );
    }

    function testFullFillRandomWorsPicksWinnerResetsStateAndSendMoney()
        public
        raffleEnter
    {
        uint256 newPlayer = 3;
        uint256 startingIndex = 1;
        address expectedWinner = address(1);

        for (uint256 i = startingIndex; i < newPlayer + startingIndex; i++) {
            address player = address(uint160(i)); // ! For address needs to be uint160
            hoax(player, STARTING_USER_BALANCE);
            raffle.enterRaffle{value: raffleEntranceFee}();
        }

        uint256 startingTimeStamp = raffle.getLastTimeStamp();
        uint256 winnerStartBalance = expectedWinner.balance;
        vm.recordLogs();
        raffle.performUpkeep("");

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bytes32 requestId = entries[1].topics[1];

        console2.log("Request ID:", uint256(requestId));
        console2.log("Total players:", raffle.getPlayers().length);

        uint256 expectedIndex = uint256(requestId) % raffle.getPlayers().length;
        console2.log("Expected winner index:", expectedIndex);
        console2.log("Winner at that index:", raffle.getPlayer(expectedIndex));

        VRFCoordinatorV2_5Mock(vrfCoordinatorV2_5).fulfillRandomWords(
            uint256(requestId),
            address(raffle)
        );

        uint256 endingTimeStamp = raffle.getLastTimeStamp();
        Raffle.RaffleState raffleState = raffle.getRaffleState();
        address winner = raffle.getRecentWinner();
        uint256 winnerBalance = winner.balance;
        uint256 prize = raffleEntranceFee * (newPlayer + 1);
        address payable[] memory players = raffle.getPlayers();

        assert(winner == expectedWinner);
        assert(raffleState == Raffle.RaffleState.OPEN);
        assert(winnerBalance == winnerStartBalance + prize);
        assert(endingTimeStamp > startingTimeStamp);
        assert(raffle.getPlayers().length == 0);
        assert(address(raffle).balance == 0);
        assert(players.length == 0);
    }
}
