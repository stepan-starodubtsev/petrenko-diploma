// src/App.jsx
import React from 'react';
import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './styles/theme';
import {Routes, Route, Navigate, Outlet, useLocation} from 'react-router-dom'; // Додали Outlet, useLocation
import {observer} from 'mobx-react-lite'; // Для ProtectedRoute
import {useStores} from './stores'; // Для ProtectedRoute

import NavBar from './components/layout/NavBar';
import LoginPage from './pages/LoginPage'; // <--- Імпортуємо LoginPage
import DashboardPage from './pages/DashboardPage';
import HostsListPage from './pages/HostsListPage';
import AddHostPage from './pages/AddHostPage';
import EditHostPage from './pages/EditHostPage';
import HostDetailPage from './pages/HostDetailPage';
import PendingAgentsPage from './pages/PendingAgentsPage';
import ProblemsPage from './pages/ProblemsPage';
import {Container, Typography} from '@mui/material';
import CircularProgress from "@mui/material/CircularProgress";
import UsersManagementPage from "./pages/UsersManagementPage.jsx"; // Додав імпорт з MUI


// Компонент для захищених маршрутів
const ProtectedRoute = observer(() => {
    const {authStore} = useStores();
    const location = useLocation();

    if (authStore.isLoading) { // Якщо йде перевірка статусу аутентифікації (наприклад, при завантаженні)
        return (
            <Container sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}>
                <CircularProgress/>
            </Container>
        );
    }

    return authStore.isAuthenticated ? (
        <>
            <NavBar/>
            <main>
                <Outlet/> {/* Тут будуть рендеритися дочірні захищені маршрути */}
            </main>
        </>
    ) : (
        <Navigate to="/login" state={{from: location}} replace/>
    );
});

const AdminProtectedRoute = observer(() => {
    const {authStore} = useStores();

    // Перевіряємо аутентифікацію ТА роль
    if (authStore.isAuthenticated && authStore.isAdmin) {
        return (<>
            <NavBar/>
            <main>
                <Outlet/> {/* Тут будуть рендеритися дочірні захищені маршрути */}
            </main>
        </>)
    }

    if (authStore.isAuthenticated && !authStore.isAdmin) {
        // Якщо користувач залогінений, але не адмін - можна показати сторінку "Доступ заборонено"
        return <Typography>Доступ заборонено. Потрібні права адміністратора.</Typography>;
    }

    // Якщо не аутентифікований, перенаправляємо на логін
    return <Navigate to="/login" replace/>;
});

const App = observer(() => { // App також може бути observer, якщо використовує authStore напряму
    const {authStore} = useStores();

    // Викликаємо checkAuthStatus один раз при завантаженні App,
    // щоб відновити стан аутентифікації з localStorage
    React.useEffect(() => {
        authStore.isAuthenticated;
    }, [authStore]);


    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            {/* NavBar тепер буде всередині ProtectedRoute або відображатися умовно */}
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>

                {/* Захищені маршрути */}
                <Route element={<ProtectedRoute/>}>
                    <Route path="/" element={<Navigate replace to="/dashboard"/>}/>
                    <Route path="/dashboard" element={<DashboardPage/>}/>
                    <Route path="/hosts" element={<HostsListPage/>}/>
                    <Route path="/hosts/new" element={<AddHostPage/>}/>
                    <Route path="/hosts/:hostId" element={<HostDetailPage/>}/>
                    <Route path="/hosts/:hostId/edit" element={<EditHostPage/>}/>
                    <Route path="/agents/pending" element={<PendingAgentsPage/>}/>
                    <Route path="/problems" element={<ProblemsPage/>}/>
                </Route>

                <Route element={<AdminProtectedRoute/>}>
                    <Route path="/admin/users" element={<UsersManagementPage/>}/>
                </Route>

                <Route path="*" element={
                    <Container sx={{mt: 5, textAlign: 'center'}}>
                        <Typography variant="h3">404</Typography>
                        <Typography variant="h5">Сторінку не знайдено</Typography>
                    </Container>
                }/>
            </Routes>
        </ThemeProvider>
    );
});

export default App;