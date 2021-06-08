import './Server.css';

import React from "react"

import {matchSorter} from 'match-sorter'

import {useLocation} from "react-router-dom"

import {useTable, useSortBy, useFilters, usePagination, useGlobalFilter, useAsyncDebounce} from 'react-table'

import {
    Switch,
    Link
} from "react-router-dom";

import Plotly from "plotly.js-basic-dist"
import createPlotlyComponent from "react-plotly.js/factory"
import axios from "axios";

const Plot = createPlotlyComponent(Plotly);

const {useState, useEffect} = React;

// Define a default UI for filtering
function GlobalFilter({
                          preGlobalFilteredRows,
                          globalFilter,
                          setGlobalFilter,
                      }) {
    const count = preGlobalFilteredRows.length
    const [value, setValue] = React.useState(globalFilter)
    const onChange = useAsyncDebounce(value => {
        setGlobalFilter(value || undefined)
    }, 200)

    return (
        <span>
      Search:{' '}
            <input
                value={value || ""}
                onChange={e => {
                    setValue(e.target.value);
                    onChange(e.target.value);
                }}
                placeholder={`${count} records...`}
                style={{
                    fontSize: '1.1rem',
                    border: '0',
                }}
            />
    </span>
    )
}

// Define a default UI for filtering
function DefaultColumnFilter({
                                 column: {filterValue, preFilteredRows, setFilter},
                             }) {
    const count = preFilteredRows.length

    return (
        <input
            value={filterValue || ''}
            onChange={e => {
                setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
            }}
            placeholder={`Search ${count} records...`}
        />
    )
}

// This is a custom filter UI for selecting
// a unique option from a list
function SelectColumnFilter({
                                column: {filterValue, setFilter, preFilteredRows, id},
                            }) {
    // Calculate the options for filtering
    // using the preFilteredRows
    const options = React.useMemo(() => {
        const options = new Set()
        preFilteredRows.forEach(row => {
            options.add(row.values[id])
        })
        return [...options.values()]
    }, [id, preFilteredRows])

    // Render a multi-select box
    return (
        <select
            value={filterValue}
            onChange={e => {
                setFilter(e.target.value || undefined)
            }}
        >
            <option value="">All</option>
            {options.map((option, i) => (
                <option key={i} value={option}>
                    {option}
                </option>
            ))}
        </select>
    )
}

// This is a custom UI for our 'between' or number range
// filter. It uses two number boxes and filters rows to
// ones that have values between the two
function NumberRangeColumnFilter({
                                     column: {filterValue = [], preFilteredRows, setFilter, id},
                                 }) {
    const [min, max] = React.useMemo(() => {
        let min = preFilteredRows.length ? preFilteredRows[0].values[id] : 0
        let max = preFilteredRows.length ? preFilteredRows[0].values[id] : 0
        preFilteredRows.forEach(row => {
            min = Math.min(row.values[id], min)
            max = Math.max(row.values[id], max)
        })
        return [min, max]
    }, [id, preFilteredRows])

    return (
        <div
            style={{
                display: 'flex',
            }}
        >
            <input
                value={filterValue[0] || ''}
                type="number"
                onChange={e => {
                    const val = e.target.value
                    setFilter((old = []) => [val ? parseInt(val, 10) : undefined, old[1]])
                }}
                placeholder={`Min (${min})`}
                style={{
                    width: '70px',
                    marginRight: '0.5rem',
                }}
            />
            to
            <input
                value={filterValue[1] || ''}
                type="number"
                onChange={e => {
                    const val = e.target.value
                    setFilter((old = []) => [old[0], val ? parseInt(val, 10) : undefined])
                }}
                placeholder={`Max (${max})`}
                style={{
                    width: '70px',
                    marginLeft: '0.5rem',
                }}
            />
        </div>
    )
}

function fuzzyTextFilterFn(rows, id, filterValue) {
    return matchSorter(rows, filterValue, {keys: [row => row.values[id]]})
}

// Let the table remove the filter if the string is empty
fuzzyTextFilterFn.autoRemove = val => !val

function LogsTable({columns, data}) {
    const filterTypes = React.useMemo(
        () => ({
            // Add a new fuzzyTextFilterFn filter type.
            fuzzyText: fuzzyTextFilterFn,
            // Or, override the default text filter to use
            // "startWith"
            text: (rows, id, filterValue) => {
                return rows.filter(row => {
                    const rowValue = row.values[id]
                    return rowValue !== undefined
                        ? String(rowValue)
                            .toLowerCase()
                            .startsWith(String(filterValue).toLowerCase())
                        : true
                })
            },
        }),
        []
    )

    const defaultColumn = React.useMemo(
        () => ({
            // Let's set up our default Filter UI
            Filter: DefaultColumnFilter,
        }),
        []
    )

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,

        page,
        prepareRow,
        canPreviousPage,
        canNextPage,
        pageOptions,
        pageCount,
        gotoPage,
        nextPage,
        previousPage,
        state: {pageIndex, pageSize}
    } = useTable(
        {
            columns,
            data,
            defaultColumn,
            filterTypes,
            initialState: {pageIndex: 0, pageSize: 5},
        },
        useFilters,
        useGlobalFilter,
        useSortBy,
        usePagination
    )

    return (
        <>
            <table {...getTableProps()}>
                <thead>
                {headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            // Add the sorting props to control sorting. For this example
                            // we can add them into the header props
                            <th {...column.getHeaderProps()}>
                                <div {...column.getSortByToggleProps()}>
                                    {column.render('Header')}
                                    {/* Add a sort direction indicator */}
                                    <span>
                                        {column.isSorted
                                            ? column.isSortedDesc
                                                ? ' 🔽'
                                                : ' 🔼'
                                            : ''}
                                    </span>
                                </div>
                                <div style={{marginTop: '10px'}}>
                                    {column.canFilter ? column.render('Filter') : null}
                                </div>
                            </th>
                        ))}
                    </tr>
                ))}
                </thead>
                <tbody {...getTableBodyProps()}>
                {page.map(
                    (row, i) => {
                        prepareRow(row);
                        return (
                            <tr {...row.getRowProps()}>
                                {row.cells.map(cell => {
                                    return (
                                        <td {...cell.getCellProps()} className={"data"}>{cell.render('Cell')}</td>
                                    )
                                })}
                            </tr>
                        )
                    }
                )}
                </tbody>
                <div className="pagination" style={{margin: '10px'}}>
                    <button className="action" onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
                        {'<<'}
                    </button>
                    {' '}
                    <button className="action" onClick={() => previousPage()} disabled={!canPreviousPage}>
                        {'<'}
                    </button>
                    {' '}
                    <button className="action" onClick={() => nextPage()} disabled={!canNextPage}>
                        {'>'}
                    </button>
                    {' '}
                    <button className="action" onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
                        {'>>'}
                    </button>
                    {' '}
                    <span>
                      Page{' '}
                        <strong>
                        {pageIndex + 1} of {pageOptions.length}
                      </strong>{' '}
                    </span>
                    <span> | Go to page:{' '}
                        <input
                            type="number"
                            defaultValue={pageIndex + 1}
                            onChange={e => {
                                const page = e.target.value ? Number(e.target.value) - 1 : 0
                                gotoPage(page)
                            }}
                            style={{width: '100px'}}
                        />
                    </span>
                </div>
            </table>
        </>
    )
}

function Server(props) {
    const location = useLocation();
    const serverData = location.state;

    const [timeColumn, setTimeColumn] = useState([]);
    const [memoryColumn, setMemoryColumn] = useState([]);
    const [userTimeColumn, setUserTimeColumn] = useState([]);
    const [systemTimeColumn, setSystemTimeColumn] = useState([]);

    useEffect(() => {
        function fetch() {
            const query = 'SELECT event_time, CurrentMetric_MemoryTracking, ProfileEvent_UserTimeMicroseconds, ProfileEvent_SystemTimeMicroseconds FROM system.metric_log ORDER BY event_time DESC LIMIT 100 FORMAT JSON;';

            const url = 'http://' + serverData.host_address + ':8123/?add_http_cors_header=1';

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
                    const responseData = response.data;
                    const tableData = responseData.data;

                    const newTimeColumn = tableData.map((entry) => entry['event_time']);
                    setTimeColumn(newTimeColumn);

                    const newMemoryColumn = tableData.map((entry) => entry['CurrentMetric_MemoryTracking']);
                    setMemoryColumn(newMemoryColumn);

                    const newUserTimeColumn = tableData.map((entry) => entry['ProfileEvent_UserTimeMicroseconds']);
                    setUserTimeColumn(newUserTimeColumn);

                    const newSystemTimeColumn = tableData.map((entry) => entry['ProfileEvent_SystemTimeMicroseconds']);
                    setSystemTimeColumn(newSystemTimeColumn);
                })
                .catch((error) => {
                    console.log(error);
                });
        }

        fetch();
        const periodicFetch = setInterval(fetch, 10000);
        return () => clearInterval(periodicFetch);
    }, [serverData.host_address]);

    // const [logsColumns, setLogsColumns] = useState([]);
    const logsColumns = [
        {
            "type": "Enum8('QueryStart' = 1, 'QueryFinish' = 2, 'ExceptionBeforeStart' = 3, 'ExceptionWhileProcessing' = 4)",
            "Header": "type",
            "accessor": "type",
            Filter: SelectColumnFilter,
            filter: 'includes',
            disableSortBy: true,
        },
        {
            "Header": "user",
            "accessor": "user",
            Filter: SelectColumnFilter,
            filter: 'includes',
            disableSortBy: true,
        },
        {
            "Header": "query_id",
            "accessor": "query_id",
            disableFilters: true,
            disableSortBy: true,
            Cell: ({row}) => (
                <Link
                    to={{
                        pathname: '/query',
                        state: {query: row.original}
                    }}
                    style={{color: 'inherit'}}
                >
                    {row.original.query_id}
                </Link>
            )
        },
        {
            "type": "DateTime",
            "Header": "event_time",
            "accessor": "event_time",
            disableFilters: true
        },
        {
            "type": "DateTime",
            "Header": "query_start_time",
            "accessor": "query_start_time",
            disableFilters: true
        },
        {
            "type": "UInt64",
            "Header": "query_duration_ms",
            "accessor": "query_duration_ms",
            Filter: NumberRangeColumnFilter,
            filter: 'between',
        },
        {
            "type": "UInt64",
            "Header": "read_bytes",
            "accessor": "read_bytes",
            Filter: NumberRangeColumnFilter,
            filter: 'between',
        },
    ]

    const [logsData, setLogsData] = useState([]);

    const fetch = () => {
        const query = 'SELECT * FROM system.query_log ORDER BY event_time DESC LIMIT 100 FORMAT JSON;\n';

        const url = 'http://' + serverData.host_address + ':8123/?add_http_cors_header=1';

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
                const responseData = response.data;
                console.log(typeof responseData, responseData);

                const newLogsData = responseData.data;
                console.log(newLogsData);
                setLogsData(newLogsData);
            })
            .catch((error) => {
                console.log(error);
            });
    }

    useEffect(() => {
        fetch();
        // const periodicFetch = setInterval(fetch, 10000);
        // return () => clearInterval(periodicFetch);
    }, [serverData.host_address]);

    return (
        <div>
            <div className="upper">
                <h2>Server: {serverData.host_name}</h2>
            </div>
            <div className="monitor">
                <Plot
                    data={[
                        {type: 'bar', x: timeColumn, y: memoryColumn},
                    ]}
                    layout={{width: 560, height: 400, title: 'Memory'}}
                />
                <Plot
                    data={[
                        {type: 'bar', x: timeColumn, y: userTimeColumn},
                    ]}
                    layout={{width: 560, height: 400, title: 'User Time'}}
                />
                <Plot
                    data={[
                        {type: 'bar', x: timeColumn, y: systemTimeColumn},
                    ]}
                    layout={{width: 560, height: 400, title: 'System Time'}}
                />
                <LogsTable columns={logsColumns} data={logsData}/>
                <input type="submit" value="Update" className="action" onClick={() => fetch()}/>
            </div>
        </div>
    )
}

export default Server;
