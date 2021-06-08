import './Server.css';

import React from "react"

import ReactJson from 'react-json-view'

import {useLocation} from "react-router-dom"

import Plotly from "plotly.js-basic-dist"
import createPlotlyComponent from "react-plotly.js/factory"
import axios from "axios";

const Plot = createPlotlyComponent(Plotly);

const {useState, useEffect} = React;

function Query(props) {
    const location = useLocation();
    const query = location.state.query;

    // console.log(queryData);

    return (
        <div>
            <div className="upper">
                <h2>Query: {query.query_id}</h2>
            </div>
            <div className="monitor">
                <ReactJson src={query}/>
            </div>
        </div>
    )
}

export default Query;