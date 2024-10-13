import { Algodv2 } from "algosdk";
import {
    prepareFlashLoanBegin,
    prepareFlashLoanEnd,
    prepareAddDepositEscrow,
    prepareBorrowFromLoan,
    prepareRepayLoanWithTxn,
} from "@folks-finance/folks-finance-js-sdk";

// Initialize Algodv2 client (Algorand Testnet)
const algodClient = new Algodv2("", "https://testnet-algorand.api.purestake.io/ps2", {
    "X-API-Key": "YOUR_PURESTAKE_API_KEY",
});

// User account information
const userAccount = { addr: "YOUR_ADDRESS", sk: "YOUR_SECRET_KEY" };

// Function to execute the deposit, flash loan, and borrowing process
async function depositAndBorrowWithFlashLoan(depositAmount: number) {
    try {
        // Step 1: Deposit $100 (in ALGO equivalent)
        const depositTxn = await prepareAddDepositEscrow(algodClient, userAccount.addr, depositAmount);
        console.log("Prepared deposit transaction for $100");

        // Step 2: Request flash loan of $150
        const flashLoanAmount = depositAmount * 1.5;
        const flashLoanBeginTxn = await prepareFlashLoanBegin(algodClient, userAccount.addr, flashLoanAmount);
        console.log("Prepared flash loan transaction for $150");

        // Step 3: Deposit $250 into Folks Finance (100 ALGO + 150 ALGO from flash loan)
        const totalDeposit = depositAmount + flashLoanAmount;
        const deposit250Txn = await prepareAddDepositEscrow(algodClient, userAccount.addr, totalDeposit);
        console.log("Prepared transaction to deposit $250");

        // Step 4: Borrow $150 from Folks Finance using the $250 deposit as collateral
        const borrowTxn = await prepareBorrowFromLoan(algodClient, userAccount.addr, flashLoanAmount);
        console.log("Prepared borrow transaction for $150");

        // Step 5: Repay flash loan of $150
        const repayTxn = await prepareRepayLoanWithTxn(algodClient, userAccount.addr, flashLoanAmount);
        console.log("Prepared repay transaction for flash loan");

        // End the flash loan cycle
        const flashLoanEndTxn = await prepareFlashLoanEnd(algodClient, userAccount.addr);
        console.log("Prepared flash loan end transaction");

        // Group all transactions
        const txns = [depositTxn, flashLoanBeginTxn, deposit250Txn, borrowTxn, repayTxn, flashLoanEndTxn];
        const signedTxns = txns.map((txn) => txn.signTxn(userAccount.sk));

        // Send grouped transactions
        const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
        console.log("Transaction sent with ID:", txId);

        // Confirm the transaction
        const confirmedTxn = await algodClient.pendingTransactionInformation(txId).do();
        console.log("Transaction confirmed:", confirmedTxn);

    } catch (err) {
        console.error("Error during flash loan process:", err);
    }
}

// Execute the function with a deposit amount of $100
depositAndBorrowWithFlashLoan(100);  // Depositing $100 (in ALGO equivalent)
