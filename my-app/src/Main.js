import logo from './logo.svg';
import './Main.css';
import React, {useState, useEffect} from "react";
import axios from 'axios';
import {useTable} from 'react-table'
import {
    Switch,
    Link
} from "react-router-dom";

class URLForm extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <form className="url" onSubmit={this.props.onSubmit}>
                <input type="text" value={this.props.value} onChange={this.props.onChange} placeholder="URL"/>
                <input type="submit" value="Connect" className="action"/>
            </form>
        )
    }
}

function Circle({server}) {
    const [health, setHealth] = useState('unknown');

    useEffect(() => {
        function fetch() {
            const query = 'SELECT 1;';

            const url = 'http://' + server.host_address + ':8123/?add_http_cors_header=1';

            const config = {
                method: 'post',
                url: url,
                headers: {
                    'Content-Type': 'text/plain'
                },
                data: query
            };

            axios(config)
                .then((response) => {
                    setHealth('healthy');
                })
                .catch((error) => {
                    console.log(error);
                    setHealth('unhealthy')
                });
        }

        fetch();
        const periodicFetch = setInterval(fetch, 1000);
        return () => clearInterval(periodicFetch);
    }, [server.host_address]);

    let colorClass = 'yellow';
    if (health === 'healthy') {
        colorClass = 'green';
    } else {
        colorClass = 'red';
    }

    return <span className={'dot ' + colorClass}>
        <Link
            to={{
                pathname: '/server',
                state: server
            }}
            style={{textDecoration: 'none', color: 'inherit'}}
        >
            {server.host_name}
        </Link>
    </span>
}

function NodesTable({data}) {
    // if no data provided render nothing
    if (data === undefined || (Array.isArray(data) && data.length === 0)) {
        return null;
    }

    const serversNumber = data.length;

    const tableWidth = Math.ceil(Math.sqrt(serversNumber));
    const tableHeight = Math.ceil(serversNumber / tableWidth);

    console.log(tableWidth, tableHeight);

    const circles = [...Array(tableHeight).keys()].map((_, i) =>
        <tr key={data[i].host_name}>
            {
                [...Array(tableWidth).keys()].map((_, j) =>
                    <td>
                        <Circle server={data[i * tableWidth + j]} />
                    </td>
                )
            }
        </tr>
    );

    return (
        <table>
            <tbody>
            {circles}
            </tbody>
        </table>
    )
}

class Main extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            URL: '',
            clusterTable: [],
        };

        this.handleURLChange = this.handleURLChange.bind(this);
        this.handleURLSubmit = this.handleURLSubmit.bind(this);
    }

    handleURLChange(event) {
        this.setState({URL: event.target.value});
    }

    handleURLSubmit(event) {
        event.preventDefault();

        const url = this.state.URL;

        const query = 'SELECT * FROM system.clusters FORMAT JSON;';

        const config = {
            method: 'post',
            // TODO: switch to using real provided url
            url: url + '/?add_http_cors_header=1',
            headers: {
                'Content-Type': 'text/plain'
            },
            data: query
        };

        axios(config)
            .then((response) => {
                let tableData = response.data.data;
                this.setState({clusterTable: tableData});
            })
            .catch((error) => {
                console.log(error);
            });

    }

    render() {
        return (
            <div className="Main">
                <div className="upper">
                    <div>
                        <h1 className="title">ClickHouse Monitoring</h1>
                        <URLForm
                            onChange={this.handleURLChange}
                            onSubmit={this.handleURLSubmit}
                            value={this.state.URL}
                        />
                    </div>
                </div>
                <div className="monitor">
                    <NodesTable data={this.state.clusterTable}/>
                </div>
            </div>
        );
    }
}

export default Main;
