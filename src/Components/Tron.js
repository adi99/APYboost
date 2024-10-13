import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, message, Input } from 'antd';
import { TronWeb } from 'tronweb';
import './App.css';

const App = () => {
  const [account, setAccount] = useState('');
  const [tronWeb, setTronWeb] = useState(null);
  const [balances, setBalances] = useState({
    TRX: 0,
    sTRX: 0,
    SUN: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('sTRX');
  const [supplyAmount, setSupplyAmount] = useState('');
  const [isOkEnabled, setIsOkEnabled] = useState(false); // For enabling/disabling the OK button

  const contractAddress = 'TL9TxfNcThWkYzPKD5kcbvPYF74QYVqm6V'; // Your contract address
  const sTRXAddress = 'TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3'; // Replace with your sTRX address

  const apyRates = {
    TRX: '5.2%',
    sTRX: '4.8%',
    SUN: '6.1%',
  };

  const loadBlockchainData = async () => {
    try {
      if (window.tronWeb && window.tronWeb.ready) {
        const tronWebInstance = window.tronWeb;
        setTronWeb(tronWebInstance);

        const accounts = tronWebInstance.defaultAddress.base58;
        setAccount(accounts);

        // Fetch TRX balance
        const trxBalanceInSun = await tronWebInstance.trx.getBalance(accounts);
        const trxBalance = tronWebInstance.fromSun(trxBalanceInSun);

        // Fetch sTRX balance
        const sTRXContract = await tronWebInstance.contract().at(sTRXAddress);
        const sTRXBalanceInSun = await sTRXContract.balanceOf(accounts).call();
        const sTRXBalance = parseFloat(sTRXBalanceInSun) / Math.pow(10, 18);

        setBalances((prev) => ({
          ...prev,
          TRX: trxBalance,
          sTRX: sTRXBalance,
        }));
      } else {
        throw new Error('TronWeb is not initialized. Please install TronLink.');
      }
    } catch (error) {
      console.error('Error loading blockchain data:', error);
      message.error(error.message || 'An error occurred while loading blockchain data.');
    }
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  // Check approval
  const isApproved = async (amount) => {
    try {
      const sTRXContract = await tronWeb.contract().at(sTRXAddress);
      const allowance = await sTRXContract.allowance(account, contractAddress).call();
      const allowanceInUnits = parseFloat(allowance) / Math.pow(10, 18);
      return allowanceInUnits >= amount;
    } catch (error) {
      console.error('Error checking approval:', error);
      message.error('Error checking approval.');
      return false;
    }
  };

  // Approve function
  const approveSTRX = async (amount) => {
    try {
      const sTRXContract = await tronWeb.contract().at(sTRXAddress);
      const amountInSun = (amount * Math.pow(10, 18)).toFixed(0); // Convert to Sun
      const tx = await sTRXContract.approve(contractAddress, amountInSun).send();
      message.success('sTRX Approved successfully.');
      return tx;
    } catch (error) {
      console.error('Error approving sTRX:', error);
      message.error('Error during sTRX approval.');
      throw error;
    }
  };

  // Open position function
  const openPosition = async (amount) => {
    try {
      const contract = await tronWeb.contract().at(contractAddress);
      const amountInSun = (amount * Math.pow(10, 18)).toFixed(0); // Convert to Sun
      const tx = await contract.openPosition(amountInSun).send({ from: account });
      message.success('Position opened successfully.');
      return tx;
    } catch (error) {
      console.error('Error opening position:', error);
      message.error('Error during position opening.');
      throw error;
    }
  };

  const handleAction = async () => {
    const amountToSupply = parseFloat(supplyAmount); // Use entered amount
    setLoading(true);

    try {
      const isAlreadyApproved = await isApproved(amountToSupply);
      if (!isAlreadyApproved) {
        await approveSTRX(amountToSupply);
      }
      await openPosition(amountToSupply);
      message.success(`${selectedAsset} deposited successfully!`);
    } catch (error) {
      console.error('Error during deposit:', error);
      message.error(error.message || 'An error occurred during the deposit.');
    }

    setLoading(false);
  };

  const showModal = (asset) => {
    setSelectedAsset(asset);
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
    handleAction();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSupplyAmount(''); // Reset input value on modal close
    setIsOkEnabled(false); // Disable OK button on modal close
  };

  const handleAmountChange = (e) => {
    const enteredAmount = e.target.value;
    setSupplyAmount(enteredAmount);

    // Check if entered amount is valid and less than or equal to the wallet balance
    if (enteredAmount && parseFloat(enteredAmount) > 0 && parseFloat(enteredAmount) <= balances[selectedAsset]) {
      setIsOkEnabled(true);
    } else {
      setIsOkEnabled(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Tron Multi-Asset Platform</h1>
        <Button type="primary" size="large" onClick={loadBlockchainData}>
          {account ? `Connected: ${account}` : 'Connect Wallet'}
        </Button>
      </header>

      <section className="overview-section">
        <Card title="Your Wallet Balance" className="overview-card">
          <p>{balances.TRX} TRX</p>
          <p>{balances.sTRX} sTRX</p>
        </Card>
      </section>

      <section className="asset-section">
        <h2>Supply Assets</h2>
        <div className="asset-table">
          {['TRX', 'sTRX'].map((asset) => (
            <div className="asset-row" key={asset}>
              <div className="asset-column">{asset}</div>
              <div className="asset-column">{apyRates[asset]}</div>
              <div className="asset-column">{balances[asset]}</div>
              <div className="asset-column">
                <Button onClick={() => showModal(asset)}>Supply</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        title={`Supply ${selectedAsset}`}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okButtonProps={{ disabled: !isOkEnabled }} // Disable OK button if not enabled
      >
        <p>Enter the amount of {selectedAsset} to supply:</p>
        <Input
          type="number"
          value={supplyAmount}
          onChange={handleAmountChange}
          placeholder={`Max: ${balances[selectedAsset]} ${selectedAsset}`}
        />
      </Modal>

      <footer className="footer">
        <p>Powered by Tron Blockchain</p>
      </footer>
    </div>
  );
};

export default App;
