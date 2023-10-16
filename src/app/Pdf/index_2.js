import React, { Component } from 'react';
import styles from './index_2.scss';
import { jsPDF } from "jspdf";
import { UrlUtil } from '../../utils/utils';
import PdfTool from '../PdfTool'
import ReactDOM from 'react-dom';
export default class Pdf extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            exporting: false,
            content: '',
            name: '',

            salt: UrlUtil.getQueryString('csrfPreventionSalt'),
            orderId: UrlUtil.getQueryString('orderId'),
        };

        this.pdfjs = null;
    }

    componentDidMount() {
        // 初始化页面
        this.initHome();

        this.pdfjs = new jsPDF();
        // 设置字体，否则导出PDF会乱码
        this.pdfjs.addFont(`${window.__STATICPATH}/font/font_normal.ttf`, 'pdfFont', 'normal');
        this.pdfjs.addFont(`${window.__STATICPATH}/font/font_bold.ttf`, 'pdfFont', 'bold');
        this.pdfjs.setFont("pdfFont");
    }
    componentWillUnmount() {
        this.pdfjs = null;
    }

    // 更新脚本，使模板中的脚本可以正常执行（TODO：脚本顺序）
    executeScript() {
        let scriptElements = document.querySelectorAll('.prerender script');
        scriptElements.forEach((script) => {
            // 创建一个新的 <script> 元素来执行其中的 JavaScript 代码
            const newScript = document.createElement('script');
            newScript.innerHTML = script.innerHTML;
            document.head.appendChild(newScript);
        });
    }

    // 请求模板
    getTpl() {
        return new Promise((resolve, reject) => {
           
            $.ajax({
                url: `${window.__STATICPATH}/tpl/tpl_2.html`,
                success: ret => resolve(ret),
                error: e => reject(),
            });
        });
    }
    // 请求数据
    getData() {
        let {orderId, salt} = this.state;

        return new Promise((resolve, reject) => {
            // 本地测试
            try{
                let testData = JSON.parse(localStorage.getItem('_pdf'));

                if(Object.keys(testData).length) {
                    return resolve(testData);
                }
            }catch(e){ console.log(e); }

            $.ajax({
                url: `${window.__API || ''}/qf-admin/c/onlineReport/getData?orgOrderId=${orderId}&csrfPreventionSalt=${salt}`,
                dataType: 'json',
                success: ret => {
                    if(ret.success) {
                        return resolve(ret?.data || {});
                    }
                    resolve(null);
                },
                error: e => resolve(null),
            });
        });
    }
    // 初始化页面，请求模板、请求数据
    initHome() {
        this.setState({ loading: true });
        Promise.all([this.getData(), this.getTpl()]).then(([templateData, tpl]) => {
            window.SHAREHOLDER = templateData?.SHAREHOLDER || [];
            window._entName = templateData?.basicInfo?.entName || '';

            if(templateData === null) {
                alert(`会话已过期，请登录后重新访问`);
                window.close();
            }
            // 8.4图假数据，后期getData获取
            let localStorageData = window.localStorage.getItem('__TOOL_DATA');
                let obj = JSON.parse(localStorageData),
                    selectedData = obj[1] || {};
                let data = obj
            //
            let content = '',
                date = new Date(),
                name = templateData?.basicInfo?.entName || `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}-${date.getTime()}`;
            try{
                content = template.render(tpl, {...templateData});
            }catch(e) {
                console.error(e);
            }
            this.setState({
                content,
                name,
            }, () => {
                let t = setTimeout(() => {
                    clearTimeout(t);
                    this.setState({ loading: false });
                    var tools = document.querySelector('#tools')
                    ReactDOM.render(<PdfTool data={data} selectedData={selectedData}/>, tools);
                    this.handleRender();
                }, 2000);
            });

        }).catch(e => {
            this.setState({ loading: false });
        });
    }

    // 分割单元格
    splitTrByHeight(rowElement, maxHeights, cellWidths=[], styleObj={}) {
        let cells = rowElement.cells,
            tds = rowElement.cloneNode(true).cells,
            endDiv = document.createElement('div'),
            elements = [],
            words = [],
            moreHeight = 0,
            style = '';

        if(styleObj['font-size']) style += `font-size: ${styleObj['font-size']};`;
        if(styleObj['line-height']) style += `line-height: ${styleObj['line-height']};`;

        endDiv.setAttribute('class', 'end');

        let textMaxHeights = maxHeights.map(item => item - parseInt(item%parseInt(styleObj['line-height'])));

        // 以列为准处理的
        for(let j=0;j<tds.length;j++) {
            let text = tds[j].innerText || '';
            let o = this.getDivMaxText(cellWidths[j], textMaxHeights, text, style);
            words[j] = o.text;

            if(!moreHeight) moreHeight = o['moreHeight'];
        }

        for(let i=0;i<maxHeights.length;i++) {
            let row = document.createElement('tr');

            // 先处理单元格
            for(let j=0;j<cells.length;j++) {
                let td = cells[j].cloneNode(false);
                td.textContent = words[j][i] || '';
                row.appendChild(td.cloneNode(true));
            }


            if(!i) { // 第一个和最后一个tr是需要根据前后的tr来做处理的
                // 会存在这种情况，分割的行会存在特别小的情况，导致一列里面没有一个文字，比如rowHeight=41, 剩余空间为6，此时分割就是[6, 35]，其实6这个table是无效的，应该忽略
                elements.push({type: 'tr', element: row.textContent ? row.cloneNode(true) : '', isLast: false}, {type: 'div', element: endDiv.cloneNode(true)});
            }else if(i === maxHeights.length - 1) {
                elements.push({type: 'tr', element: row.textContent ? row.cloneNode(true) : '', isLast: true});
            }else{ // 非首、尾的tr都是一个tbody
                let tableTbody = document.createElement('tbody');
                tableTbody.appendChild(row.cloneNode(true));

                elements.push({type: 'tbody', element: tableTbody.cloneNode(true)}, {type: 'div', element: endDiv.cloneNode(true)});
            }

            row = null;
        }

        return {elements, moreHeight};
    }

    // 分割表格，分割的起始、结束的表格是不需要end标志的
    splitTableByHeight(tableElement, maxHeights, pageContentHeight) {
        let maxHeight = maxHeights.shift(),
            rows = tableElement.rows,
            currentTotalHeight = 0,
            currentTable = null,
            tableContainer = document.createDocumentFragment(), // 创建一个新的 div 容器来存放拆分后的表格
            endDiv = document.createElement('div'),
            tableTHead = null, // 获取原始表格的 thead 元素
            tableTBody = null,
            lastRow = null,
            cellWidths = [];

        endDiv.setAttribute('class', 'end');

        for(let i=0;i<rows[0].cells.length;i++){
            cellWidths.push(rows[0].cells[i].clientWidth - 16)
        }

        // 第一行大于整个页面的高度，当前行小于整个页面的高度
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i],
                rowHeight = row.offsetHeight,
                splitTrLastHeight = 0;

            if(!currentTable) {
                currentTable = tableElement.cloneNode(false);
                tableContainer.appendChild(currentTable);

                tableTBody = null;
                currentTotalHeight = 0;
            }

            if(!tableTBody && row.parentNode.tagName.toLowerCase() === 'tbody' && row.textContent.trim()) {
                tableTBody = row.parentNode.cloneNode(false);
                currentTable.appendChild(tableTBody);


                if(lastRow) {
                    tableTBody.appendChild(lastRow);

                    lastRow = null;
                }
            }

            // 直接拷贝这行就行
            if(currentTotalHeight + rowHeight <= maxHeight) {
                if(row.parentNode.tagName.toLowerCase() === 'thead') {
                    // 避免thead出现在页面最下面，所以在table的前面插入一个end标志；注意：这里currentTotalHeight需要不为0，否则不用额外处理
                    if(currentTotalHeight && currentTotalHeight + rowHeight === maxHeight) tableContainer.insertBefore(endDiv.cloneNode(true));

                    let tableTHeadEle = row.parentNode.cloneNode(true);
                    // 拷贝thead，需要有内容
                    tableTHead = tableTHeadEle.cloneNode(true);
                    currentTable.appendChild(tableTHead);
                }else{
                    tableTBody.appendChild(row.cloneNode(true));
                }
            }else{
                // 注意：这里一定是要分割的表格的高度 - 当前累计的高度，而不是页面高度 - 累计高度
                let pageLeftHeight = maxHeight - currentTotalHeight;
                // 累计高度满足了且是正常的行高情况下，此时也需要重置 currentTable
                if(rowHeight <= pageLeftHeight) {
                    i !== rows.length && tableContainer.appendChild(endDiv.cloneNode(true));
                    currentTable = null;

                }else if(i === row.length - 1) {
                    // 最后一行不用比较高度，没必要
                    tableTBody.appendChild(row.cloneNode(true));
                }else{
                    let o = getComputedStyle(tableElement.querySelector('td'))

                    // 第N行的高度太大
                    // 分割tr时，因为tr需要放到table中，所以会有padding的问题，所以这里不能简单的计算
                    let firstTableHeight = pageLeftHeight, // 第一个表格的高度，也是当前页剩余的空间
                        tableCount = parseInt((rowHeight - firstTableHeight)/pageContentHeight),
                        otherHeight = tableCount ? (new Array(tableCount)).fill(pageContentHeight) : [],
                        lastTableHeight = parseInt((rowHeight - firstTableHeight)%pageContentHeight),
                        heights = [firstTableHeight].concat(otherHeight, lastTableHeight), // 最后一行可能会大于理论值
                        obj = this.splitTrByHeight(row.cloneNode(true), heights.slice(0), cellWidths, o),
                        elements = obj.elements || [];

                    splitTrLastHeight = obj.moreHeight || 0;

                    for(let ii=0;ii<elements.length;ii++) {
                        let {type, element, isLast} = elements[ii] || {};

                        if('div' === type) {
                            tableContainer.appendChild(element);
                            currentTable = null;
                            tableTBody = null;
                        }else if('tr' === type && !isLast) {
                            if(element) {
                                tableTBody.appendChild(element);
                                currentTable.appendChild(tableTBody);
                            }

                            // 拷贝完tbody后就需要重置 currentTable 了
                            currentTable = null;
                            tableTBody = null;
                        }else if('tr' === type && isLast) {
                            // 最后一行 且 是分割的table的最后一个表格，那么新建table并结束
                            if(i && i === rows.length - 1) {
                                if(element) {
                                    currentTable = tableElement.cloneNode(false);
                                    tableTBody = row.parentNode.cloneNode(false);

                                    tableTBody.appendChild(element.cloneNode(true));
                                    currentTable.appendChild(tableTBody);
                                    tableContainer.appendChild(currentTable);
                                }
                            }else{
                                lastRow = element.cloneNode(true);
                            }
                        }else if('tbody' === type) {
                            currentTable = tableElement.cloneNode(false);
                            tableContainer.appendChild(currentTable);

                            currentTable.appendChild(element);
                        }
                    }
                }

                maxHeight = maxHeights.shift();
            }

            // 更新当前表格的高度
            currentTotalHeight += (rowHeight + splitTrLastHeight);
        }

        let tempDiv = document.createElement('div');
        tempDiv.appendChild(tableContainer.cloneNode(true));
        let html = tempDiv.innerHTML;

        tableElement.insertAdjacentHTML('beforebegin', html);

        // 移除原始表格
        tableElement.parentNode.removeChild(tableElement);

        tempDiv = null;
        endDiv = null;
        tableContainer = null;
    }

    // 新增页面
    createPage() {
        let sectionDiv = document.createElement('div');
        sectionDiv.setAttribute('class', 'page');

        // TODO
        // 注意：header这里应该有个paddingBottom，因为在分割表格时，分割后的表格会直接顶着header，所以需要有个paddingBottom
        let sectionHeader = document.createElement('div');
        sectionHeader.setAttribute('class', 'ph');

        // 考虑footer是否需要如header那样有个paddingTop
        let sectionFooter = document.createElement('div');
        sectionFooter.setAttribute('class', 'pf');
        let div1 = document.createElement('div'),
            div2 = document.createElement('div');
        div1.innerHTML = `致诚信用/<span>线上标准报告</span>`;
        div2.setAttribute('class', 'pagination');
        sectionFooter.appendChild(div1);
        sectionFooter.appendChild(div2);

        sectionDiv.appendChild(sectionHeader);
        sectionDiv.appendChild(sectionFooter);

        let pageContainer = document.querySelector('.pages');
        pageContainer.appendChild(sectionDiv);

        return sectionDiv;
    }

    // 计算指定宽高的div内最多容纳多少文字
    getDivMaxText(width, heights, str='', style='') {
        let x = 'position: absolute;left:-5000px;bottom:-5000px;opacity: 0;z-index: -1;',
            div = document.createElement('span'),
            eleHeights = heights.slice(0),
            startIndex = 0,
            text = [],
            moreHeight = 0;

        div.setAttribute('style', `${x}margin: 24px auto;display:inline-block;width:${width}px;background-color: #cfcfcf;${style}`);
        document.body.appendChild(div);

        for(let i=0;i<eleHeights.length;i++) {
            let endIndex = startIndex,
                loop = true;

            while(loop) {
                endIndex++;
                div.innerText = str.substring(startIndex, endIndex);

                // 这里不能包含 等于 ，如果包含了等于，那么一行刚开始时 等式 就成立了，后续的文字就截断了，其实只有在大于时才应该返回上一步的结束值
                if(div.offsetHeight > eleHeights[i] && i !== eleHeights.length-1) {
                    loop = false;
                }
                if(endIndex > str.length) {
                    loop = false;

                    moreHeight = div.offsetHeight - eleHeights[i];
                }
            }

            text.push( str.substring(startIndex, endIndex-1) );
            startIndex = endIndex-1;
        }

        div.parentNode.removeChild(div);
        return {text, moreHeight: moreHeight >= 0 ? moreHeight : 0};
    }

    // 将模板处理成PDF导出前的页面

    handleRender() {
        let index = 0,
            currentSum = 0,
            currentPage = null,
            pageHeight = 842,
            pageHeaderHeight = 36,
            pageFooterHeight = 42,
            pageContentHeight = pageHeight - pageHeaderHeight - pageFooterHeight,
            loop = $('.prerender .pdf-section').length > 0,
            loopLimit = ($('.prerender .pdf-section').children()?.length || 1)*2;

        while(loop && loopLimit >= 0) {
            let elements = $('.prerender .pdf-section'),
                currentEle = elements.children()[index],
                currentEleHeight = currentEle.offsetHeight; // 包括border和padding

            // 避免死循环
            loopLimit--;

            if(loopLimit < 5) {
                console.log(loopLimit);
            }

            // 如果本身就是page页面，那么就直接复制页面
            if(currentEle.classList.contains('page')) {
                let node = currentEle.cloneNode(true);
                node.classList.add('origin-page');
                document.querySelector('.pages').appendChild(node);

                index++;
                currentPage = null;
                currentSum = 0;
                continue;
            }else if(currentEle.classList.contains('end')) {
                index++;
                currentPage = null;
                currentSum = 0;
                continue;
            }else if(['STYLE', 'SCRIPT'].includes(currentEle.tagName)){
                index++;
                continue;
            }

            if(currentSum + currentEleHeight <= pageContentHeight) {
                if(!currentPage) currentPage = this.createPage(); // 元素追加到page里

                currentPage.appendChild(currentEle.cloneNode(true));

                currentSum += currentEleHeight;
                index++;

                if(currentSum + currentEleHeight === pageContentHeight) {
                    currentPage = null;
                    currentSum = 0;
                }
            }else{
                // 拆分元素，不用记录
                // currentSum有可能正好为0，
                if(currentEle.tagName.toLowerCase() === 'table') {
                    // 分割表格时，表格高度会略小于需要的值，保证页面协调
                    let tableEmptyHeight = 24,
                        suitableTableHeight = pageContentHeight - tableEmptyHeight,
                        firstTableHeight = suitableTableHeight - currentSum,
                        tableCount = parseInt((currentEleHeight - firstTableHeight)/suitableTableHeight),
                        otherHeight = tableCount ? (new Array(tableCount)).fill(suitableTableHeight) : [],
                        lastTableHeight = parseInt((currentEleHeight - firstTableHeight)%suitableTableHeight),
                        heights = [firstTableHeight].concat(otherHeight, lastTableHeight < 12 ? [] : lastTableHeight); // 这里最后一个table的高度如果很小，那么就忽略掉


                    // 这里只负责分割table，并将拆分后的table插入在页面上
                    this.splitTableByHeight(currentEle, heights.slice(0), suitableTableHeight);
                }else{
                    // 重置page
                    // 只要 currentSum + currentEleHeight <= 762且当前元素不是table，说明一个page已经填充完毕
                    currentPage = null;
                    currentSum = 0;
                }
            }

            if(!$('.prerender .pdf-section').children()[index]) loop = false;
        }


        // 处理分页
        let pagination = document.querySelectorAll('.pagination');
        for(let i=0;i<pagination.length;i++) {
            pagination[i].innerText = `${i+1} / ${pagination.length}`;
        }

        // 处理标号
        let titles = document.querySelectorAll('.section-title');
        for(let i=0;i<titles.length;i++) {}


        // 重新替换脚本，让脚本执行
        this.executeScript();

        // 改变浏览器标题
        window._entName && (document.title = window._entName);
    }

    // 导出成PDF
    export() {
        this.setState({ exporting: true });
        // 获取内容主体的宽、高
        let element = document.querySelector('.pages'),
            doc = this.pdfjs,
            padding = 12 * 0,
            contentWidth = element.clientWidth,
            pdfWidth = parseInt(doc.internal.pageSize.getWidth() - 2 * padding),
            pdfHeight = parseInt(doc.internal.pageSize.getHeight() - 2 * padding),
            scaleFactor = parseFloat((pdfWidth / contentWidth).toFixed(3)),
            sections = $('.section'),
            sectionHeight = parseInt(contentWidth * pdfHeight / pdfWidth),
            { name } = this.state;

        // 调整section的margin为0后导出
        document.querySelectorAll('.page').forEach(item => item.classList.add('export'));
        doc.html(element, {
            callback: (doc) => {
                let count = doc.internal.pages;
                // 删除最后一页空白页，因为page高位842，其实PDF的高为841.5，所以最后会多出一个空白页，移除掉就行
                doc.deletePage(count.length-1);

                doc.save(`${name}_(线上标准报告)_cn.pdf`);
                this.setState({ exporting: false }, () => {
                    document.querySelectorAll('.page').forEach(item => item.classList.remove('export'));
                });
            },
            width: doc.internal.pageSize.getWidth(),
            windowWidth: element.offsetWidth,
        });
    }

    render() {
        let { content, loading, exporting } = this.state;
        return (
            <div className={styles['container']}>
                {
                    loading || exporting ?
                        <div className={styles['loading']}>
                            <div className={styles['loading-spinner']}></div>
                            {loading ? '加载中...' : '导出中...'}
                        </div>
                        :
                        <div className={styles['export-pdf']} onClick={this.export.bind(this)}>导出<br />PDF</div>
                }

                <div className={styles['container-box']}>
                    <div className="pages"></div>
                    <div className="pages prerender" dangerouslySetInnerHTML={{ __html: content }}></div>
                </div>
            </div>
        );
    }
}
