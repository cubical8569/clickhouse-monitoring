import Main from './Main'
import Server from './Server'
import Query from "./Query";

import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";

function App() {
    return (
        <Router>
            <Switch>
                <Route path="/server">
                    <Server/>
                </Route>
                <Route path="/query">
                    <Query/>
                </Route>
                <Route path="/">
                    <Main/>
                </Route>
            </Switch>
        </Router>
    )
}

export default App;