import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Services from './pages/Services'
import NavbarPage from './pages/NavbarPage'
import Numbers from './pages/Numbers'
import Clients from './pages/Clients'
import LogoShader from './pages/LogoShader'
import HomeServices from './pages/HomeServices'
import ServiceCardPage from './pages/ServiceCardPage'
import JiraTicketPage from './pages/JiraTicketPage'
import ProcessPage from './pages/ProcessPage'
import ButtonsPage from './pages/ButtonsPage'
import RouteSwitcher from './components/RouteSwitcher'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/links" element={<Services />} />
        <Route path="/navbar" element={<NavbarPage />} />
        <Route path="/numbers" element={<Numbers />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/logo-shader" element={<LogoShader />} />
        <Route path="/home-services" element={<HomeServices />} />
        <Route path="/service-card" element={<ServiceCardPage />} />
        <Route path="/jira-ticket" element={<JiraTicketPage />} />
        <Route path="/process" element={<ProcessPage />} />
        <Route path="/buttons" element={<ButtonsPage />} />
      </Routes>
      <RouteSwitcher />
    </>
  )
}

export default App
