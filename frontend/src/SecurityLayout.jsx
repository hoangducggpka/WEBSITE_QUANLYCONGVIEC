//src/SecurityLayout.jsx
import { Routes, Route } from "react-router-dom";

import SecurityDashboard from "./page/SecurityDashboard";

const SecurityLayout = () => {

    return (

        <Routes>

            <Route
                path="/"
                element={<SecurityDashboard />}
            />

        </Routes>

    );
};

export default SecurityLayout;