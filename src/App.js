import { ChainId, Fetcher, Percent, Route, Token, TokenAmount, Trade, TradeType, WETH } from '@uniswap/sdk';
import {ethers} from 'ethers';
import {useState, useEffect} from 'react';
import {abi} from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'

const setup = async () => {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const BTEE = new Token(
      ChainId.RINKEBY, 
      '0x467f6314e8dede2b94cc25015a925eed08e62455', 
      0,
      provider
      );

      const UniswapRouter = new ethers.Contract(
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', 
        abi, 
        provider
        ).connect(signer);

      const pair = await Fetcher.fetchPairData(BTEE, WETH[BTEE.chainId], provider);
      const route = new Route([pair], WETH[BTEE.chainId])
      return {pair, BTEE, route, signer, UniswapRouter};
}


function App() {
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('1');
  const [route, setRoute] = useState();
  const [trade, setTrade] = useState();
  const [signer, setSigner] = useState();
  const [uniswapRouter, setUniswapRouter] = useState();
  const [pair, setPair] = useState();
  const [BTEE, setBTEE] = useState();

  const init = async () => {
    const variables = await setup();
    setPair(variables.pair);
    setBTEE(variables.BTEE);
    setRoute(variables.route);
    setSigner(variables.signer);
    setUniswapRouter(variables.UniswapRouter);
    setLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() =>{
    if (BTEE && route && !loading) {
      const newTrade = new Trade(
        route, 
        new TokenAmount(BTEE, Number(amount)), 
        TradeType.EXACT_OUTPUT
        );
        setTrade(newTrade);
    }
  }, [amount, BTEE, route, loading]);

  const buy = async (event) => {
    event.preventDefault();
    const slippageTolerance = new Percent('5000', '10000');
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex
    const path = [WETH[BTEE.chainId].address, BTEE.address];
    const to = await signer.getAddress(); // should be a checksummed recipient address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
    const value = trade.inputAmount.raw; // // needs to be converted to e.g. hex

    await uniswapRouter.swapExactETHForTokens(
      ethers.BigNumber.from(String(amountOutMin)).toHexString(), 
      path, 
      to, 
      deadline, 
      {value: ethers.BigNumber.from(String(value)).toHexString()});
  };

  return <>{loading ? 'Cargando...' : 
  <>
  <p>BTEE/ETH: {route.midPrice.toSignificant(2)}</p>
  <p>ETH/BTEE: {route.midPrice.invert().toSignificant(2)}</p>
  <form onSubmit={buy} className="form-inline justify-content-center">
    <input value={amount} onChange={({ target: {value}}) => setAmount(value)} type="number" min="1" placeholder="Cantidad de playeras a comprar..." className="form-control" />
    <button className="btn btn-primary">Comprar</button>
  </form>
  <p>Price impact: {trade?.priceImpact.toSignificant(5)}</p>
  </>
  }</>
}

export default App;
