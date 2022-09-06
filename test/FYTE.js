const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("FYTE", function () {

  const ONE_DAY_IN_SECS = 24 * 60 * 60;

  async function deployFYTEFixture() {

    const [owner, account2, account3] = await ethers.getSigners();
    const FTYE = await ethers.getContractFactory("FYTE");
    const NFT = await ethers.getContractFactory("NFT");
    const nftV1 = await NFT.deploy();
    const nftV2 = await NFT.deploy();
    const fyte = await FTYE.deploy([owner.address, account2.address], [80, 20], nftV1.address, nftV2.address);

    return { fyte, nftV1, nftV2, owner, account2 };
  };

  describe("Deployment", function () {
    it("Should set pause to false", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      expect(await fyte.Paused()).to.equal(false);
    });

    it("Should set FYTECost to 10 ether", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      expect(await fyte.FYTECost()).to.equal(ethers.utils.parseEther("10.0"));
    });

    it("Should set V1ClaimAmount to 10", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      expect(await fyte.V1ClaimAmount()).to.equal(10);
    });

    it("Should set V2ClaimAmount to 15", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      expect(await fyte.V2ClaimAmount()).to.equal(5);
    });

    it("Should set V1address to nftV1", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      expect(await fyte.V1Address()).to.equal(nftV1.address);
    });

    it("Should set V2address to nftV2", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      expect(await fyte.V2Address()).to.equal(nftV2.address);
    });
  });

  describe("Buy Tokens", function () {
    it("Should revert with the right error if insufficient funds sent", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      await expect(fyte.Buy(1, { value: 1 })).to.be.revertedWith(
        "Not enough ETH sent"
      );
    });

    it("Should revert if buy functionality paused", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      await fyte.setPaused(true);
      await expect(fyte.Buy(1, { value: ethers.utils.parseEther("10.0") })).to.be.revertedWith(
        "Buy Functionality Paused"
      );
    });

    it("Should mint the correct number of tokens to purchaser", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      const amount = 1;
      const eth = (amount * 10.0).toString();
      await fyte.connect(owner).Buy(amount, { value: ethers.utils.parseEther(eth) });
      expect(await fyte.balanceOf(owner.address)).to.equal(amount);
    });

    it("Should transfer funds to contract on purchase", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      await expect(fyte.Buy(1, { value: ethers.utils.parseEther("10.0") })).to.changeEtherBalances(
        [owner, fyte],
        [ethers.utils.parseEther("-10.0"), ethers.utils.parseEther("10.0")]
      )
    });
  });

  describe("Claim Tokens", function () {
    it("Should claim correct number of tokens for nftv1", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await nftV1.connect(owner).safeMint(owner.address);
      await fyte.connect(owner).Claim();
      expect(await fyte.balanceOf(owner.address)).to.equal(10);
    });

    it("Should claim correct number of tokens for nftv2", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await nftV2.connect(owner).safeMint(owner.address);
      await fyte.connect(owner).Claim();
      expect(await fyte.balanceOf(owner.address)).to.equal(5);
    });

    it("Should prevent multiple claims per day", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.connect(owner).Claim();
      await expect(fyte.connect(owner).Claim()).to.be.revertedWith("Claim attempt to soon.");
    });

    it("Should allow other users to claim", async function () {
      const { fyte, owner, account2, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.connect(owner).Claim();
      expect(await fyte.connect(account2).Claim());
    });

    it("Should claim again after 24 hours", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.connect(owner).Claim();
      const claim_time = await (time.latest()) + ONE_DAY_IN_SECS;
      await time.increaseTo(claim_time);
      expect(await fyte.connect(owner).Claim());
    });

    it("Should revert if claim functionality paused", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.setPaused(true);
      await expect(fyte.Claim()).to.be.revertedWith(
        "Claim Functionality Paused"
      );
    });
  });

  describe("View Time To Claim", function () {
    it("Should show 0 if claim available", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      expect(await fyte.timeToClaim()).to.equal(0);
    });

    it("Should show remaining time to claim", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.Claim();
      const claimTime = await time.latest();
      const nextClaimTime = claimTime + ONE_DAY_IN_SECS;
      expect(await fyte.timeToClaim()).to.equal((nextClaimTime - await time.latest()) / 60 / 60);
    });

    it("Should show remaining time to claim after 12 hours", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.Claim();
      const claimTime = await time.latest();
      const claim12 = claimTime + (ONE_DAY_IN_SECS / 2);
      const nextClaimTime = claimTime + ONE_DAY_IN_SECS;
      await time.increaseTo(claim12);
      expect(await fyte.timeToClaim()).to.equal((nextClaimTime - await time.latest()) / 60 / 60);
    });

    it("Should reset after 24 hours", async function () {
      const { fyte, owner, otherAccount, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.Claim();
      const claimTime = await time.latest();
      const nextClaimTime = claimTime + ONE_DAY_IN_SECS;
      await time.increaseTo(nextClaimTime);
      expect(await fyte.timeToClaim()).to.equal(0);
    });

    it("Should show remaining time for second account after first claims", async function () {
      const { fyte, owner, account2, nftV1, nftV2 } = await loadFixture(deployFYTEFixture);
      await fyte.connect(owner).Claim();
      expect(await fyte.connect(account2).timeToClaim()).to.equal(0);
    });
  });

  describe("Change Globals", function () {

    describe("Pause contract", function () {
      it("Should pause contract", async function () {
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        await fyte.setPaused(true);
        expect(await fyte.Paused()).to.equal(true);
      });

      it("Only owner", async function () {
        const { fyte, owner, account2 } = await loadFixture(deployFYTEFixture);
        await expect(fyte.connect(account2).setPaused(true)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    describe("Change V1ClaimAmount", function () {
      it("Should change V1ClaimAmount", async function () {
        const { fyte, owner, account2 } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await fyte.setV1ClaimAmount(new_amount);
        expect(await fyte.V1ClaimAmount()).to.equal(new_amount);
      });

      it("Only owner", async function () {
        const { fyte, owner, account2 } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await expect(fyte.connect(account2).setV1ClaimAmount(new_amount)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    describe("Change V2ClaimAmount", function () {
      it("Should change V2ClaimAmount", async function () {
        const { fyte, owner, account2 } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await fyte.setV2ClaimAmount(new_amount);
        expect(await fyte.V2ClaimAmount()).to.equal(new_amount);
      });

      it("Only owner", async function () {
        const { fyte, owner, account2 } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await expect(fyte.connect(account2).setV2ClaimAmount(new_amount)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    describe("Change FYTECost", function () {
      it("Should change FYTECost", async function () {
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        const new_amount = ethers.utils.parseEther("15.0");
        await fyte.setFYTECost(new_amount);
        expect(await fyte.FYTECost()).to.equal(new_amount);
      });

      it("Only owner", async function () {
        const { fyte, owner, account2 } = await loadFixture(deployFYTEFixture);
        const new_amount = ethers.utils.parseEther("15.0");
        await expect(fyte.connect(account2).setFYTECost(new_amount)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });
  });
});