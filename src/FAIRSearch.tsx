import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Widget } from "@lumino/widgets";

import { showErrorMessage } from '@jupyterlab/apputils';

import { INotebookTracker } from '@jupyterlab/notebook';

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

import { debounce } from "ts-debounce";


export interface IProps {
    open(openas: string): void;
}

export interface IState {
    source: 'nanopub' | 'workflowhub';
    searchtext: string;
}


class DataExplorer extends React.Component<IProps, IState> {
    debounced_search: ReturnType<typeof debounce>;
    constructor(props: IProps) {
        super(props);
        this.state = {
            source: 'nanopub',
            searchtext: ''
        };
        
        this.debounced_search = debounce(this.search, 500);
    }

    onDatasetClick = (event: any) => {
        console.log(event);
    }

    onSearchEntry = (event: any) => {
        this.setState({searchtext: event.target.value});
        this.debounced_search();
    }

    search = () => {
        console.log('searching:', this.state.searchtext);
    }

    render() {
        console.log('Rendering DataExplorer')
        return (
            <div>
                <h3>FAIR Search</h3>
                <input type="text" id="searchentry" name="searchentry" onChange={this.onSearchEntry} value={this.state.searchtext} />
                <button type="button" onClick={this.onDatasetClick}>Search!</button> 
            </div>
        );
    }
}

export class TestWidget extends Widget {
    tracker: INotebookTracker;
    constructor(tracker: INotebookTracker) {
        super();
        this.tracker = tracker;
        this.title.label = 'FAIRWorkflows';
        this.title.caption = 'FAIR Workflows';
        this.id = 'fairworkflowswidget';
        this.addClass('jp-fairwidget')

        this.update();
    }

    onUpdateRequest() {
        console.log('TestWidget onUpdateRequest()');

        ReactDOM.unmountComponentAtNode(this.node);
        ReactDOM.render(<DataExplorer open={this.onOpen} />, this.node);        
    }

    onOpen = (openas: string) => {
        if (!this.tracker.currentWidget) {
            showErrorMessage('Unable to inject cell without an active notebook', {});
            return;
        }
        const notebook = this.tracker.currentWidget.content;
        console.log(openas, notebook);

        requestAPI<any>('nanosearch?search_str=fair')
            .then(data => {
                console.log(data);
            })
            .catch(reason => {
                console.error('The FAIRWorkflowsExtension server extension appears to be missing.\n${reason}');
            });
    }

}

export async function requestAPI<T>(
    endPoint = '',
    init: RequestInit = {}
): Promise<T> {
    // Make request to Jupyter API
    const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(
            settings.baseUrl,
            'FAIRWorkflowsExtension', // API Namespace
            endPoint
            );

    console.log('requestAPI called with ' + endPoint + ' ' + init + ', ' + requestUrl);

    let response: Response;
    try {
        response = await ServerConnection.makeRequest(requestUrl, init, settings);
    } catch (error) {
        throw new ServerConnection.NetworkError(error);
    }

    const data = await response.json();

    if (!response.ok) {
        throw new ServerConnection.ResponseError(response, data.message);
    }

    return data;
}


