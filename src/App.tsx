import { Outlet, Route, Routes, Navigate } from 'react-router-dom'
import { IconSprite } from './icons'
import { TabBar } from './components/TabBar'
import Home from './screens/Home'
import Programs from './screens/Programs'
import Progress from './screens/Progress'
import Journal from './screens/Journal'
import Settings from './screens/Settings'
import Catalog from './screens/Catalog'
import Editor from './screens/Editor'
import SessionDetail from './screens/SessionDetail'
import Workout from './screens/Workout'

function Shell() {
  return (
    <div className="app">
      <Outlet />
      <TabBar />
    </div>
  )
}

export default function App() {
  return (
    <>
      <IconSprite />
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/programs/:id/edit" element={<Editor />} />
          <Route path="/session/:id" element={<SessionDetail />} />
        </Route>
        <Route path="/workout/:programId/:dayId" element={<Workout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
