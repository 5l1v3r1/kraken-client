import React, { Component } from 'react';
import DetailBox from '../../components/DetailBox/DetailBox';
import SectionHeading from '../../components/SectionHeading/SectionHeading';
import StatusBox from '../../components/StatusBox/StatusBox';
import SummaryTable from '../../components/SummaryTable/SummaryTable';
import Pagination from './../../components/Pagination/Pagination';
import Octicon, { Trashcan } from '@githubprimer/octicons-react';
import WorkerService from '../../services/WorkerService'
import NotificationService from '../../utils/NotificiationService';
import Spinner from 'react-bootstrap/Spinner'

import classes from './Workers.module.css'

class Workers extends Component {

    state = {
        loadingStatus: null,

        // Page Size
        pageSize: 4,

        getWorkerTimer: null,
        workers: [],
        currentPage: 1,
        totalPages: 1,

        // Special Fields
        activeWorkers: 0,
        onlineWorkers: 0,
        offlineWorkers: 0,
        jobsInQueue: 0
    }

    render() {
        // Create Detail Section
        const detailSection = (
            <div className={classes.detailContainer}>
                <DetailBox boxValue={this.state.activeWorkers.toString()} boxText={'Active Workers'} />
                <DetailBox boxValue={this.state.onlineWorkers.toString()} boxText={'Online Workers'} />
                <DetailBox boxValue={this.state.offlineWorkers.toString()} boxText={'Offline Workers'} />
                <div className={classes.lastDetailItem}>
                    <DetailBox boxValue={this.state.jobsInQueue.toString()} boxText={'Jobs In Queue'} />
                </div>
            </div>
        );

        // Create Table Section
        const tableHeadings = ['Name', 'Type', 'Status', 'Last Check In', ' '].map(tableHeading => {
            return <th className={classes.tableHeaderColumnText} key={tableHeading}>{tableHeading}</th>
        });
        const tableItems = this.state.workers.map(activeWorker => {
            return (
                <tr key={activeWorker.id}>
                    <td className={classes.tableItem}><strong>{activeWorker.name}</strong></td>
                    <td className={classes.tableItem}>{activeWorker.type.toLowerCase()}</td>
                    <td className={classes.tableItem}><StatusBox status={activeWorker.status} /></td>
                    <td className={classes.tableItem}>{new Date(activeWorker.lastCheckIn).toLocaleString()}</td>
                    <td onClick={() => { this.deleteWorker(activeWorker.id); }}
                        className={classes.tableItem} style={{ color: "red", cursor: 'pointer' }}>
                        <Octicon icon={Trashcan} fill='red' />
                    </td>
                </tr>
            );
        });
        for (let i = tableItems.length; i < this.state.pageSize; i++) {
            tableItems.push(<tr key={i} >
                <td className={classes.tableItem}>&nbsp;</td>
                <td className={classes.tableItem}>&nbsp;</td>
                <td className={classes.tableItem}>&nbsp;</td>
                <td className={classes.tableItem}>&nbsp;</td>
                <td className={classes.tableItem}>&nbsp;</td>
            </tr>)
        }

        // Loading Elements
        let loadingSpinner;
        let loadingBackground;
        switch (this.state.loadingStatus) {
            case "PROGRESS":
                loadingBackground = <div className={classes.loadingBackground} />
                loadingSpinner = <Spinner className={classes.loadingSpinner} animation="border" />
                break;
            default:
                loadingBackground = null;
                loadingSpinner = null;
        }

        // Render
        return (
            <div>
                <SectionHeading heading={'Your Workers'} />
                <div className={classes.main}>
                    {loadingBackground}
                    {loadingSpinner}
                    {detailSection}
                    <SummaryTable
                        tableHeadings={tableHeadings}
                        tableItems={tableItems} />
                    <Pagination
                        nextOnClick={this.nextPage}
                        prevOnClick={this.prevPage}
                        currentPage={this.state.currentPage}
                        totalPages={this.state.totalPages} />
                </div>
            </div>
        );
    }

    componentDidMount = async () => {
        try {
            await this.promisedSetState({ loadingStatus: "PROGRESS" })
            this.getSummary();
            this.getWorkers();
            const timer = setInterval(() => {
                this.getSummary();
                this.getWorkers();
            }, 15000);
            this.setState({ getWorkerTimer: timer })
        }
        finally{
            await this.promisedSetState({ loadingStatus: null })
        }
    }

    componentWillUnmount() {
        clearInterval(this.state.getWorkerTimer);
    }

    nextPage = async () => {
        if (this.state.currentPage + 1 <= this.state.totalPages) {
            try {
                await this.promisedSetState({ currentPage: this.state.currentPage + 1, loadingStatus: "PROGRESS" })
                this.getWorkers()
            }
            finally {
                await this.promisedSetState({ loadingStatus: null })
            }
        }
    }

    prevPage = async () => {
        if (this.state.currentPage - 1 >= 1) {
            try {
                await this.promisedSetState({ currentPage: this.state.currentPage - 1, loadingStatus: "PROGRESS" })
                this.getWorkers()
            }
            finally {
                await this.promisedSetState({ loadingStatus: null })
            }
        }
    }

    getSummary = async () => {
        try {
            const response = await WorkerService.getSummary()
            await this.promisedSetState({
                activeWorkers: response.data.totalActiveWorkers,
                onlineWorkers: response.data.totalOnlineWorkers,
                offlineWorkers: response.data.totalOfflineWorkers,
                jobsInQueue: response.data.jobsInQueue
            })
        }
        catch (error) {
            NotificationService.showNotification(error.response.data.message, false)
        }
    }

    getWorkers = async () => {
        try {
            const response = await WorkerService.getWorkers(this.state.currentPage, this.state.pageSize)
            await this.promisedSetState({
                workers: response.data.content,
                totalPages: response.data.totalPages === 0 ? 1 : response.data.totalPages,
            })
        }
        catch (error) {
            NotificationService.showNotification(error.response.data.message, false)
        }
    }

    deleteWorker = async (workerId) => {
        try {
            await this.promisedSetState({ loadingStatus: "PROGRESS" })
            await WorkerService.deleteWorker(workerId)
            this.getSummary();
            this.getWorkers();
        }
        catch (error) {
            NotificationService.showNotification(error.response.data.message, false)
        }
        finally {
            await this.promisedSetState({ loadingStatus: null })
        }
    }

    promisedSetState = (newState) => {
        return new Promise((resolve) => {
            this.setState(newState, () => {
                resolve()
            });
        });
    }
}

export default Workers;