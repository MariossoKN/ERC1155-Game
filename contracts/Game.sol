// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Game is VRFConsumerBaseV2, ERC1155, Ownable {
    /////////
    // Errors
    /////////
    error Game__YouAlreadyOwnACharacter();
    error Game__NoCharacterFound();
    error Game__CharacterAlreadyOnMission();
    error Game__CharacterStillOnMission(uint256 timePassed);
    error Game__FailedToCalculateRewards();
    error Game__YourAddressDoesnOwnAnyCharacter();
    error Game__YouDontOwnEnoughGold(uint256 weaponUpgradePrice);
    error Game__YourWeaponIsMaxUpgraded();
    error Game__WaitingForTheRandomNumber();
    error Game__OnlyMagicSwordCanBeEnchanted();

    //////////////////
    // State variables
    //////////////////
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable s_subId;
    uint16 private immutable i_requestConfirmations;
    uint32 private immutable i_callbackGasLimit;
    mapping(address requester => uint256 requestId) addressToRequestId;
    //     private s_requestIdToAddress;
    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests;
    uint256 public lastRequestId;
    uint256[] public requestIds;

    string private s_uri;

    uint256 private s_character = 0;
    uint256 private s_gold = 1;
    uint256 private s_woodenSword = 2;
    uint256 private s_steelSword = 3;
    uint256 private s_magicSword = 4;
    uint256 private s_legendaryFireSword = 5;
    uint256 private s_missionTimeInSeconds = 28800;
    uint256 private s_weaponUpgradePrice = 150;
    uint256 private s_legendaryFireSwordPrice = 1500;

    struct Character {
        bool onMission;
        uint256 missionStartTimeStamp;
        uint8 weaponLevel;
    }

    mapping(address player => Character) private character;

    constructor(
        address _vrfCoordinator,
        bytes32 _gasLane,
        uint64 _subId,
        uint16 _requestConfirmations,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC1155("") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_gasLane = _gasLane;
        s_subId = _subId;
        i_requestConfirmations = _requestConfirmations;
        i_callbackGasLimit = _callbackGasLimit;
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function createCharacter() public {
        if (character[msg.sender].weaponLevel > 0) {
            revert Game__YouAlreadyOwnACharacter();
        }
        character[msg.sender].weaponLevel = 1;
        _mint(msg.sender, s_character, 1, "");
        _mint(msg.sender, s_gold, 50, "");
        _mint(msg.sender, s_woodenSword, 1, "");
    }

    function upgradeWeaponLevel() public {
        uint256 weaponLevel = character[msg.sender].weaponLevel;
        if (weaponLevel == 0) {
            revert Game__YourAddressDoesnOwnAnyCharacter();
        }
        if (weaponLevel == 3) {
            revert Game__YourWeaponIsMaxUpgraded();
        }
        if (balanceOf(msg.sender, s_gold) < s_weaponUpgradePrice) {
            revert Game__YouDontOwnEnoughGold(s_weaponUpgradePrice);
        }
        if (weaponLevel == 1) {
            _burn(msg.sender, s_woodenSword, 1);
            _mint(msg.sender, s_steelSword, 1, "");
            safeTransferFrom(msg.sender, address(this), s_gold, s_weaponUpgradePrice, "");
            character[msg.sender].weaponLevel = 2;
        } else if (weaponLevel == 2) {
            _burn(msg.sender, s_steelSword, 1);
            _mint(msg.sender, s_magicSword, 1, "");
            safeTransferFrom(msg.sender, address(this), s_gold, s_weaponUpgradePrice, "");
            character[msg.sender].weaponLevel = 3;
        }
    }

    function sendCharacterToMission() public returns (uint256 requestId) {
        if (balanceOf(msg.sender, 0) == 0) {
            revert Game__NoCharacterFound();
        }
        if (character[msg.sender].onMission == true) {
            revert Game__CharacterAlreadyOnMission();
        }
        character[msg.sender].onMission = true;
        character[msg.sender].missionStartTimeStamp = block.timestamp;
        // Will revert if subscription is not set and funded.
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            s_subId,
            i_requestConfirmations,
            i_callbackGasLimit,
            1
        );
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        requestIds.push(requestId);
        lastRequestId = requestId;
        // emit RequestSent(requestId, numWords);
    }

    // 4hod (14400) 6hod (21600) 8hod (28800)       1hod (3600)
    function finishMission() public {
        uint256 timePassed = block.timestamp - character[msg.sender].missionStartTimeStamp;
        uint256 weaponLevel = character[msg.sender].weaponLevel;
        if ((timePassed) < s_missionTimeInSeconds - (weaponLevel * 3600)) {
            revert Game__CharacterStillOnMission(timePassed);
        }
        character[msg.sender].onMission = false;
        uint256 requestId = addressToRequestId[msg.sender];
        if (s_requests[requestId].fulfilled = false) {
            revert Game__WaitingForTheRandomNumber();
        }
        uint256 calculatedNumber = calculateRewards(s_requests[requestId].randomWords[0] % 100);
        _mint(msg.sender, s_gold, 2 * calculatedNumber, "");
    }

    function enchantMagicWeaponToFireWeapon() public {
        if (balanceOf(msg.sender, s_gold) < s_legendaryFireSwordPrice) {
            revert Game__YouDontOwnEnoughGold(s_legendaryFireSwordPrice);
        }
        if (character[msg.sender].weaponLevel != 3) {
            revert Game__OnlyMagicSwordCanBeEnchanted();
        }
        _burn(msg.sender, s_magicSword, 1);
        _mint(msg.sender, s_legendaryFireSword, 1, "");
        safeTransferFrom(msg.sender, address(this), s_gold, s_legendaryFireSwordPrice, "");
        character[msg.sender].weaponLevel = 4;
    }

    // function mint(
    //     address account,
    //     uint256 id,
    //     uint256 amount,
    //     bytes memory data
    // ) public onlyOwner {
    //     _mint(account, id, amount, data);
    // }

    // function mintBatch(
    //     address to,
    //     uint256[] memory ids,
    //     uint256[] memory amounts,
    //     bytes memory data
    // ) public onlyOwner {
    //     _mintBatch(to, ids, amounts, data);
    // }

    // function requestRandomWords()
    //     external
    //     onlyOwner
    //     returns (uint256 requestId)
    // {
    //     // Will revert if subscription is not set and funded.
    //     requestId = i_vrfCoordinator.requestRandomWords(
    //         i_gasLane,
    //         s_subId,
    //         i_requestConfirmations,
    //         i_callbackGasLimit,
    //         1
    //     );
    //     s_requests[requestId] = RequestStatus({
    //         randomWords: new uint256[](0),
    //         exists: true,
    //         fulfilled: false
    //     });
    //     requestIds.push(requestId);
    //     lastRequestId = requestId;
    //     // emit RequestSent(requestId, numWords);
    //     return requestId;
    // }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        // emit RequestFulfilled(_requestId, _randomWords);
    }

    function calculateRewards(uint256 _randomWord) public pure returns (uint256) {
        if (_randomWord >= 60) {
            return 10;
        } else if (_randomWord >= 30) {
            return 15;
        } else if (_randomWord >= 10) {
            return 20;
        } else if (_randomWord < 10) {
            return 30;
        } else revert Game__FailedToCalculateRewards();
    }
}
