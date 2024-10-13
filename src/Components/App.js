import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, message, Input } from 'antd';
import { TronWeb } from 'tronweb';
import './App.css';

const App = () => {
  const [account, setAccount] = useState('');
  const [tronWeb, setTronWeb] = useState(null);
  const [balances, setBalances] = useState({
    TRX: 0,
    JST: 0,
    SUN: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('JST');
  const [supplyAmount, setSupplyAmount] = useState('');
  const [isOkEnabled, setIsOkEnabled] = useState(false); // For enabling/disabling the OK button

  const contractAddress = 'TL9TxfNcThWkYzPKD5kcbvPYF74QYVqm6V'; // Your contract address
  const JSTAddress = 'TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3'; // Replace with your JST address

  const apyRates = {
    TRX: '25.2%',
    JST: '14.8%',
    SUN: '16.1%',
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

        // Fetch JST balance
        const JSTContract = await tronWebInstance.contract().at(JSTAddress);
        const JSTBalanceInSun = await JSTContract.balanceOf(accounts).call();
        const JSTBalance = parseFloat(JSTBalanceInSun) / Math.pow(10, 18);

        setBalances((prev) => ({
          ...prev,
          TRX: trxBalance,
          JST: JSTBalance,
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
      const JSTContract = await tronWeb.contract().at(JSTAddress);
      const allowance = await JSTContract.allowance(account, contractAddress).call();
      const allowanceInUnits = parseFloat(allowance) / Math.pow(10, 18);
      return allowanceInUnits >= amount;
    } catch (error) {
      console.error('Error checking approval:', error);
      message.error('Error checking approval.');
      return false;
    }
  };

  // Approve function
  const approveJST = async (amount) => {
    try {
      const JSTContract = await tronWeb.contract().at(JSTAddress);
      const amountInSun = (amount * Math.pow(10, 18)).toFixed(0); // Convert to Sun
      const tx = await JSTContract.approve(contractAddress, amountInSun).send();
      message.success('JST Approved successfully.');
      return tx;
    } catch (error) {
      console.error('Error approving JST:', error);
      message.error('Error during JST approval.');
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
        await approveJST(amountToSupply);
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
        <h1 className="title">APYboost</h1>
        <Button type="primary" size="large" onClick={loadBlockchainData}>
          {account ? `Connected: ${account}` : 'Connect Wallet'}
        </Button>
      </header>

      <section className="overview-section">
        <Card title="Your Wallet Balance" className="overview-card">
          <p>{balances.TRX} TRX</p>
          <p>{balances.JST} JST</p>
        </Card>
      </section>

      <section className="asset-section">
        <h2>Supply Assets</h2>
        <div className="asset-table">
          {['TRX', 'JST'].map((asset) => (
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
