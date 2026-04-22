import { Navigate, Route, Routes } from 'react-router-dom'
import { TerminalChrome } from './components/terminal/TerminalChrome'
import { OPTIONS_TERMINAL_SYMBOLS, STOCK_TERMINAL_SYMBOLS } from './config/terminalSymbols'
import NewsAdminPage from './pages/NewsAdminPage'
import OptionsTerminalPage from './pages/OptionsTerminalPage'
import StockTerminalPage from './pages/StockTerminalPage'

const stockHome = STOCK_TERMINAL_SYMBOLS[0]
const optionsHome = OPTIONS_TERMINAL_SYMBOLS[0]

function App() {
  return (
    <Routes>
      <Route element={<TerminalChrome />}>
        <Route path="/" element={<Navigate to={`/stocks/${stockHome}`} replace />} />
        <Route path="/stocks" element={<Navigate to={`/stocks/${stockHome}`} replace />} />
        <Route path="/stocks/:symbol" element={<StockTerminalPage />} />
        <Route path="/options" element={<Navigate to={`/options/${optionsHome}`} replace />} />
        <Route path="/options/:symbol" element={<OptionsTerminalPage />} />
        <Route path="/news-admin" element={<NewsAdminPage />} />
        <Route path="*" element={<Navigate to={`/stocks/${stockHome}`} replace />} />
      </Route>
    </Routes>
  )
}

export default App
