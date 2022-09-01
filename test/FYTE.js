const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("FYTE", function () {

  const ONE_DAY_IN_SECS = 24 * 60 * 60;

  async function deployFYTEFixture() {

    const [owner, otherAccount] = await ethers.getSigners();
    const FTYE = await ethers.getContractFactory("FYTE");
    const fyte = await FTYE.deploy([owner.address], [100]);

    return { fyte, owner, otherAccount };
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
    it("Should claim tokens", async function () {
      const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
      await fyte.Claim();

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
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        await expect(fyte.connect(otherAccount).setPaused(true)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    describe("Change V1ClaimAmount", function () {
      it("Should change V1ClaimAmount", async function () {
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await fyte.setV1ClaimAmount(new_amount);
        expect(await fyte.V1ClaimAmount()).to.equal(new_amount);
      });

      it("Only owner", async function () {
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await expect(fyte.connect(otherAccount).setV1ClaimAmount(new_amount)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    describe("Change V2ClaimAmount", function () {
      it("Should change V2ClaimAmount", async function () {
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await fyte.setV2ClaimAmount(new_amount);
        expect(await fyte.V2ClaimAmount()).to.equal(new_amount);
      });

      it("Only owner", async function () {
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        const new_amount = 15;
        await expect(fyte.connect(otherAccount).setV2ClaimAmount(new_amount)).to.be.revertedWith(
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
        const { fyte, owner, otherAccount } = await loadFixture(deployFYTEFixture);
        const new_amount = ethers.utils.parseEther("15.0");
        await expect(fyte.connect(otherAccount).setFYTECost(new_amount)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });
  });
});