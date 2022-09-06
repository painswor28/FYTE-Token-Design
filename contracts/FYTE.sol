// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

contract FYTE is ERC20, Ownable, PaymentSplitter {
    bool public Paused = false;
    address public V2Address;
    address public V1Address;
    uint256 public V1ClaimAmount;
    uint256 public V2ClaimAmount;
    uint256 public FYTECost = 10 ether;
    mapping(address => uint256) public claimChecker;

    constructor(
        address[] memory _payees,
        uint256[] memory _shares,
        address _V1Address,
        address _V2Address
    ) ERC20("FYTE", "FYTE") PaymentSplitter(_payees, _shares) Ownable() {
        V1Address = _V1Address;
        V2Address = _V2Address;
        V1ClaimAmount = 10;
        V2ClaimAmount = 5;
    }

    function Claim() public {
        require(Paused == false, "Claim Functionality Paused");
        require(timeToClaim() == 0, "Claim attempt to soon.");

        claimChecker[msg.sender] = block.timestamp;

        uint256 V1Balance = IERC721(V1Address).balanceOf(msg.sender);
        uint256 V2Balance = IERC721(V2Address).balanceOf(msg.sender);

        _mint(msg.sender, V1ClaimAmount * V1Balance);
        _mint(msg.sender, V2ClaimAmount * V2Balance);
    }

    function Buy(uint256 input_amount) public payable {
        require(Paused == false, "Buy Functionality Paused");
        require(msg.value >= FYTECost * input_amount, "Not enough ETH sent");

        _mint(msg.sender, input_amount);
    }

    function timeToClaim() public view returns (uint256) {
        uint256 last_claim = claimChecker[msg.sender];

        if (last_claim == 0 || 24 hours < (block.timestamp - last_claim)) {
            return 0;
        }

        return
            (24 hours - (block.timestamp - claimChecker[msg.sender])) / 60 / 60;
    }

    function setPaused(bool _paused) public onlyOwner {
        Paused = _paused;
    }

    function setV1ClaimAmount(uint256 input_amount) public onlyOwner {
        V1ClaimAmount = input_amount;
    }

    function setV2ClaimAmount(uint256 input_amount) public onlyOwner {
        V2ClaimAmount = input_amount;
    }

    function setFYTECost(uint256 input_amount) public onlyOwner {
        FYTECost = input_amount;
    }
}
