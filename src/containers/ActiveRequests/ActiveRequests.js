import React, { Component } from 'react';
import Pagination from './../../components/Pagination/Pagination';
import SectionHeading from './../../components/SectionHeading/SectionHeading';
import DetailBox from './../../components/DetailBox/DetailBox';
import SummaryTable from './../../components/SummaryTable/SummaryTable';
import ProgressBar from 'react-bootstrap/ProgressBar';
import ActiveRequestService from '../../services/ActiveRequestService';
import NotificationService from '../../utils/NotificiationService';
import Octicon, { Trashcan } from '@githubprimer/octicons-react';
import Spinner from 'react-bootstrap/Spinner'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'

import classes from './ActiveRequests.module.css'

class ActiveRequests extends Component {

    state = {
        loadingStatus: null,
        deleteConfirmationId: null,

        // Page Size
        pageSize: 4,

        getActiveRequestTimer: null,
        activeRequests: new Array(5),
        currentPage: 1,
        totalPages: 1,

        //  Summary Section Fields
        totalActiveRequests: 0,
        totalJobCount: 0,
        completeJobCount: 0,
        errorJobCount: 0
    }

    render() {
        // Create Summary Section
        const summarySection = (
            <div className={classes.detailContainer} >
                <DetailBox
                    boxValue={this.state.totalActiveRequests.toString()}
                    boxText={'Active Requests'} />
                <div className={classes.progressBarContainer}>
                    <ProgressBar className={classes.progressBar} max={this.state.totalJobCount}>
                        {this.state.completeJobCount > 0 ?
                            <ProgressBar variant="success" max={this.state.totalJobCount} now={this.state.completeJobCount} /> : null}
                        {this.state.errorJobCount > 0 ?
                            <ProgressBar variant="danger" max={this.state.totalJobCount} now={this.state.errorJobCount} /> : null}
                    </ProgressBar>
                    <div className={classes.boxText}>Progress</div>
                </div>
            </div>
        );

        // Create Table Section
        const tableHeadings = ['Name', 'Type', 'Total Jobs', 'Completed Jobs', 'Errors', ' '].map(tableHeading => {
            return <th className={classes.tableHeaderColumnText} key={tableHeading}>{tableHeading}</th>
        });
        const tableItems = this.state.activeRequests.map(activeRequest => {
            return (
                <tr key={activeRequest.id}>
                    <td className={classes.tableItem}><strong>{activeRequest.requestName}</strong></td>
                    <td className={classes.tableItem}>{activeRequest.requestType}</td>
                    <td className={classes.tableItem}>{activeRequest.totalJobCount}</td>
                    <td className={classes.tableItem}>{activeRequest.completedJobCount}</td>
                    <td className={classes.tableItem}>{activeRequest.errorJobCount}</td>
                    <td className={classes.tableItem} style={{ color: "red", cursor: 'pointer' }}
                        onClick={() => this.promisedSetState({ deleteConfirmationId: activeRequest.id })}>
                        <Octicon icon={Trashcan} />
                    </td>
                </tr>
            );
        })
        for (let i = tableItems.length; i < this.state.pageSize; i++) {
            tableItems.push(<tr key={i} >
                <td className={classes.tableItem}>&nbsp;</td>
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

        // Delete Confirmation Modal
        let deleteConfirmationModal = this.buildModal();

        // Render
        return (
            <div>
                {deleteConfirmationModal}
                <SectionHeading heading={'Your Active Requests'} />
                <div className={classes.main}>
                    {loadingBackground}
                    {loadingSpinner}
                    {summarySection}
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

    buildModal = () => {
        return (
            <Modal show={this.state.deleteConfirmationId !== null}
                onHide={() => this.promisedSetState({ deleteConfirmationId: null })}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body>This action will permanently delete this <strong>Active Request</strong>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => this.promisedSetState({ deleteConfirmationId: null })}>
                        Close
                    </Button>
                    <Button variant="danger" onClick={() => this.deleteActiveRequest()}>
                        Yes, Delete it
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }

    componentDidMount = async () => {
        try {
            await this.promisedSetState({ loadingStatus: "PROGRESS" })
            this.getActiveRequests()
            this.getSummary()
            const timer = setInterval(() => {
                this.getActiveRequests()
                this.getSummary()
            }, 15000);
            this.setState({ getActiveRequestTimer: timer })
        }
        finally {
            await this.promisedSetState({ loadingStatus: null })
        }
    }

    componentWillUnmount() {
        clearInterval(this.state.getActiveRequestTimer);
    }

    UNSAFE_componentWillReceiveProps(props) {
        if (props.needsToRefresh) {
            this.getActiveRequests()
            this.getSummary()
            props.refreshCompleteCallback();
        }
    }

    nextPage = async () => {
        if (this.state.currentPage + 1 <= this.state.totalPages) {
            try {
                await this.promisedSetState({ currentPage: this.state.currentPage + 1, loadingStatus: "PROGRESS" })
                this.getActiveRequests()
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
                this.getActiveRequests()
            }
            finally {
                await this.promisedSetState({ loadingStatus: null })
            }
        }
    }

    getSummary = async () => {
        try {
            const response = await ActiveRequestService.getSummary(this.onGetSummarySuccess)
            await this.promisedSetState({
                totalActiveRequests: response.data.totalActiveRequests,
                totalJobCount: response.data.totalJobCount,
                completeJobCount: response.data.completeJobCount,
                errorJobCount: response.data.errorJobCount
            })
        }
        catch (error) {
            NotificationService.showNotification(error.response.data.message, false)
        }
    }

    getActiveRequests = async () => {
        try {
            const response = await ActiveRequestService.getActiveRequests(this.state.currentPage, this.state.pageSize)
            await this.promisedSetState({
                activeRequests: response.data.content,
                totalPages: response.data.totalPages === 0 ? 1 : response.data.totalPages,
            })
        }
        catch (error) {
            NotificationService.showNotification(error.response.data.message, false)
        }
    }

    deleteActiveRequest = async () => {
        if (this.state.deleteConfirmationId !== null) {
            try {
                await this.promisedSetState({ loadingStatus: "PROGRESS" })
                await ActiveRequestService.deleteActiveRequest(this.state.deleteConfirmationId);
                this.getSummary()
                this.getActiveRequests()
            }
            catch (error) {
                NotificationService.showNotification(error.response.data.message, false)
            }
            finally {
                await this.promisedSetState({ loadingStatus: null, deleteConfirmationId: null })
            }
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

export default ActiveRequests;