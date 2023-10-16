import React, { Component } from 'react';
import styles from './index_3.scss';
import { jsPDF } from "jspdf";

export default class Pdf extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            exporting: false,
            content: '',
            originData: {},
            output: 'pdf',
        };

        this.pdfjs = null;

        this.message = this.handleMessage.bind(this);
    }

    handleMessage(e) {
        if(e?.data?.id === 'ubetter') {
            console.log(e.data);
            let content = e.data?.content || '<div class="pdf-section"><div>U+Better</div></div>',
                originData = e.data?.originData || {},
                output = e.data?.output || 'pdf';

            this.setState({ content, output, originData }, () => {
                let t = setTimeout(() => {
                    clearTimeout(t);
                    this.setState({ loading: false });

                    this.handleRender();
                }, 1000);
            });
        }
    }

    componentDidMount() {
        this.pdfjs = new jsPDF({
            unit: 'px',
            format: [793, 1122],
            compress: true,
            hotfixes: ['px_scaling'],
        });
        // 设置字体，否则导出PDF会乱码，样式表中引用的字体必须使用才会加载，否则无效
        this.pdfjs.addFont(`https://images.jc-jc.com.cn/font/fzst_normal.ttf`, 'pdfFont', 'normal');
        this.pdfjs.setFont("pdfFont");


        window.addEventListener('message', this.message, false);
    }
    componentWillUnmount() {
        this.pdfjs = null;

        window.removeEventListener('message', this.message, false);
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

    // 分割单元格
    splitTr(rowElement, trHeight, cellWidths=[], styleObj={}) {
        let cells = rowElement.cells,
            tds = rowElement.cloneNode(true).cells,
            elements = [],
            words = [],
            style = '';

        if(styleObj['font-size']) style += `font-size: ${styleObj['font-size']};`;
        if(styleObj['line-height']) style += `line-height: ${styleObj['line-height']};`;
        if(styleObj['word-break']) style += `word-break: ${styleObj['word-break']};`;
        if(styleObj['padding']) style += `padding: ${styleObj['padding']};`;

        // 以列为准处理的
        for(let j=0;j<tds.length;j++) {
            let text = tds[j].innerText || '';
            let o = this.getDivMaxText(cellWidths[j], trHeight, text, style);
            words[j] = o;
        }

        for(let i=0;i<2;i++) {
            let row = document.createElement('tr');

            // 先处理单元格
            for(let j=0;j<cells.length;j++) {
                let td = cells[j].cloneNode(false);
                td.textContent = words[j][i] || '';
                row.appendChild(td.cloneNode(true));
            }

            let text = row.textContent;
            elements.push({element: text ? row.cloneNode(true) : '', index: i});
        }

        return elements;
    }

    // 分割表格，分割的起始、结束的表格是不需要end标志的
    splitTable(tableElement, tableHeight) {
        let rows = tableElement.rows,
            currentTotalHeight = 0,
            currentTable = null,
            tableContainer = document.createDocumentFragment(), // 创建一个新的 div 容器来存放拆分后的表格
            endDiv = document.createElement('div'),
            tableTHead = null, // 获取原始表格的 thead 元素
            tableTBody = null,
            lineHeight = 18,
            hasSplit = false,
            cellWidths = [],
            o = getComputedStyle(tableElement.querySelector('td')),
            trLastRow = null;

        endDiv.setAttribute('class', 'end');

        for(let i=0;i<rows[0].cells.length;i++){
            // 宽度可能是个小数，比如62.5423，这种情况只能取62，否则取出的文字可能就会多，进而导致单元格高度超过限制高度
            let w = rows[0].cells[i].getBoundingClientRect().width;

            cellWidths.push(parseInt(w));
        }

        for(let i=0;i<rows.length;i++) {
            let row = rows[i],
                rowHeight = row.offsetHeight;

            if(!currentTable) {
                currentTable = tableElement.cloneNode(false);
                tableContainer.appendChild(currentTable);

                tableTBody = null;
                currentTotalHeight = 0;
            }
            if(!tableTBody && row.parentNode.tagName.toLowerCase() === 'tbody') {
                tableTBody = row.parentNode.cloneNode(false);
                currentTable.appendChild(tableTBody);
            }

            if(hasSplit) {
                if(trLastRow) {
                    tableTBody.appendChild(trLastRow.cloneNode(true));
                    trLastRow = null;
                }

                tableTBody.appendChild(row.cloneNode(true));

                continue;
            }

            if(currentTotalHeight + rowHeight <= tableHeight) {
                if(row.parentNode.tagName.toLowerCase() === 'thead') {
                    // thead这里需要额外处理下
                    // condition1：rowHeight < tableHeight - 看下一行的高度是否能放下
                    // condition2：rowHeight === tableHeight - 避免thead出现在页面最下面，所以在table的前面插入一个end标志；
                    // condition3：rowHeight > tableHeight - 此时直接进入下面的else中
                    if(i === 0 && currentTotalHeight === 0) {
                        if(rowHeight === tableHeight) {
                            tableElement.parentNode.insertBefore(endDiv.cloneNode(true), tableElement);
                            return;
                        }
                    }

                    let tableTHeadEle = row.parentNode.cloneNode(true);
                    // 拷贝thead，需要有内容
                    tableTHead = tableTHeadEle.cloneNode(true);
                    currentTable.appendChild(tableTHead);
                }else{
                    tableTBody.appendChild(row.cloneNode(true));
                }

                currentTotalHeight += rowHeight;
            }else{
                // 会出现一种情况，就是thead高度开始就大于页面需要的空间，此时应该直接分页，开始新的的遍历
                if(i === 0 && currentTotalHeight === 0 && row.parentNode.tagName.toLowerCase() === 'thead') {
                    tableElement.parentNode.insertBefore(endDiv.cloneNode(true), tableElement);
                    return;
                }

                let leftHeight = tableHeight - currentTotalHeight;
                // 只要rowHeight >= lineHeight 且 rowHeight > leftHeight 就拆分单元格，否则就是新建页面
                if(rowHeight > lineHeight && rowHeight > leftHeight) {
                    let trs = this.splitTr(row.cloneNode(true), leftHeight, cellWidths, o),
                        tr0 = trs[0],
                        tr1 = trs[1];

                    if(tr0.element) {
                        tableTBody.appendChild(tr0.element.cloneNode(true));
                    }

                    // 拆分单元格后是需要打个end标志的
                    tableContainer.appendChild(endDiv.cloneNode(true));
                    hasSplit = true;
                    tableTBody = null;
                    currentTable = null;

                    if(tr1.element) {
                        // 已经是最后一行了
                        if(i === rows.length - 1) {
                            // 新建table
                            currentTable = tableElement.cloneNode(false);
                            tableContainer.appendChild(currentTable);
                            // 新建tbody
                            tableTBody = row.parentNode.cloneNode(false);
                            currentTable.appendChild(tableTBody);
                            // 追加tbody
                            tableTBody.appendChild(tr1.element.cloneNode(true));
                        }else{
                            trLastRow = tr1.element;
                        }
                    }
                }else{
                    // 如果i===1，且单元正常结束一轮遍历，说明thead单独放上一页了，此时需要结束遍历，插入end后重新进入table逻辑
                    if(i === 1 && tableTHead) {
                        tableElement.parentNode.insertBefore(endDiv.cloneNode(true), tableElement);
                        return;
                    }
                    tableContainer.appendChild(endDiv.cloneNode(true));

                    hasSplit = true;
                    tableTBody = null;
                    currentTable = null;

                    // row元素回退一行
                    i = i - 1;
                }
            }
        }

        let tempDiv = document.createElement('div');
        tempDiv.appendChild(tableContainer.cloneNode(true));
        let html = tempDiv.innerHTML;

        tableElement.insertAdjacentHTML('beforebegin', html);

        // 移除原始表格
        tableElement.parentNode.removeChild(tableElement);

        tempDiv = null;
        endDiv = null;
        tableTBody = null;
        tableTHead = null;
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
        sectionHeader.innerHTML = '<img src="/admin/logo_text_1.png" alt="" />'

        // 考虑footer是否需要如header那样有个paddingTop
        let sectionFooter = document.createElement('div');
        sectionFooter.setAttribute('class', 'pf');

        let e1 = document.getElementById('customerServicePhone'),
            e2 = document.getElementById('salesmanPhone');
        if(!e1 && !e2) {
            sectionFooter.innerHTML = `优嘉贝帝建材集采网`;
        }else{
            sectionFooter.innerHTML = `${e1 ? e1.innerHTML : ''}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${e2 ? e2.innerHTML : ''}`;
        }


        sectionDiv.appendChild(sectionHeader);
        sectionDiv.appendChild(sectionFooter);

        let pageContainer = document.querySelector('.pages');
        pageContainer.appendChild(sectionDiv);

        return sectionDiv;
    }

    // 计算指定宽高的div内最多容纳多少文字
    getDivMaxText(width, height, str='', style='') {
        let x = 'position: absolute;left:-5000px;bottom:-5000px;opacity: 0;z-index: -1;',
            div = document.createElement('span'),
            startIndex = 0,
            text = [],
            endIndex = 0,
            loop = true;

        div.setAttribute('style', `${x}margin: 24px auto;display:inline-block;width:${width}px;background-color: #cfcfcf;${style}`);
        document.body.appendChild(div);

        while(loop) {
            endIndex++;
            div.innerText = str.substring(startIndex, endIndex);

            // 这里不能包含 等于 ，如果包含了等于，那么一行刚开始时 等式 就成立了，后续的文字就截断了，其实只有在大于时才应该返回上一步的结束值
            if(div.offsetHeight > height) {
                loop = false;
            }
            if(endIndex > str.length) {
                loop = false;
            }
        }

        text.push( str.substring(startIndex, endIndex-1) );
        text.push(str.substring(endIndex-1));

        div.parentNode.removeChild(div);
        return text;
    }

    // 将模板处理成PDF导出前的页面
    handleRender() {
        let index = 0,
            currentSum = 0,
            currentPage = null,
            pageHeight = 1122,
            pageHeaderHeight = 90,
            pageFooterHeight = 74,
            pageContentHeight = pageHeight - pageHeaderHeight - pageFooterHeight,
            loop = $('.prerender .pdf-section').length > 0,
            loopLimit = ($('.prerender .pdf-section').children()?.length || 1)*2;

        while(loop && loopLimit >= 0) {
            let elements = $('.prerender .pdf-section'),
                currentEle = elements.children()[index],
                currentEleHeight = currentEle?.offsetHeight || 0; // 包括border和padding

            // 避免死循环
            loopLimit--;
            if(!currentEle)  continue;

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

            // 这里冗余出 2px 空间，因为table有1px的border，可能会因为这1px而进入死循环
            if(currentSum + currentEleHeight <= pageContentHeight + 2) {
                if(!currentPage) currentPage = this.createPage(); // 元素追加到page里

                currentPage.appendChild(currentEle.cloneNode(true));

                currentSum += currentEleHeight;
                index++;
            }else{
                // 拆分元素，不用记录
                // currentSum有可能正好为0，
                if(currentEle.tagName.toLowerCase() === 'table') {
                    // 分割表格时，表格高度会略小于需要的值，保证页面协调
                    let tableEmptyHeight = 1,
                        suitableTableHeight = pageContentHeight - tableEmptyHeight,
                        firstTableHeight = suitableTableHeight - currentSum;

                    // 这里只负责分割table，并将拆分后的table插入在页面上
                    this.splitTable(currentEle, firstTableHeight, suitableTableHeight);
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
            { originData } = this.state,
            name = originData?.exportName || 'u_better',
            status = originData?.status || '';

        // 调整section的margin为0后导出
        document.querySelectorAll('.page').forEach(item => item.classList.add('export'));
        doc.html(element, {
            callback: (doc) => {
                let count = doc.internal.pages;
                // 删除最后一页空白页，因为page高位842，其实PDF的高为841.5，所以最后会多出一个空白页，移除掉就行
                doc.deletePage(count.length-1);

                doc.save(`${name}.pdf`);
                this.setState({ exporting: false }, () => {
                    document.querySelectorAll('.page').forEach(item => item.classList.remove('export'));
                });
            },
            width: doc.internal.pageSize.getWidth(),
            windowWidth: element.offsetWidth,
        });
    }
    // 导出PNG
    exportPng() {
        this.setState({ exporting: true });
        let pngElement = document.getElementById('export-png'),
            name = pngElement.getAttribute('data-name') || '';

        pngElement.classList.add('export-png');
        // 使用HTML2Canvas截取元素并将其转化为图像
        html2canvas(pngElement).then(function (canvas) {
          // 将Canvas的数据URL设置为下载链接的href属性
          const imgDataUrl = canvas.toDataURL('image/png');

          // 创建一个下载链接
          const downloadLink = document.createElement('a');
          downloadLink.href = imgDataUrl;

          // 设置下载链接的下载属性和文件名
          downloadLink.download = name ? `${name}.png` : 'sample.png';

          // 模拟点击下载链接
          document.body.appendChild(downloadLink);
          downloadLink.click();

          // 清除下载链接
          document.body.removeChild(downloadLink);
          pngElement.classList.remove('export-png');
          this.setState({ exporting: false });
        }).catch(e => {
            this.setState({ exporting: false });
        });
    }

    render() {
        let { content, loading, exporting, output } = this.state;
        return (
            <div className={styles['container']}>
                {
                    loading || exporting ?
                        <div className={styles['loading']}>
                            <div className={styles['loading-spinner']}></div>
                            {loading ? '加载中...' : '导出中...'}
                        </div>
                        :
                        (
                            output === 'png' ?
                                <div className={styles['export-pdf']} onClick={this.exportPng.bind(this)}>导出<br />PNG</div>
                                :
                                <div className={styles['export-pdf']} onClick={this.export.bind(this)}>导出<br />PDF</div>
                            )
                }

                <div className={styles['container-box']}>
                    <div className="pages"></div>
                    <div className="pages prerender" dangerouslySetInnerHTML={{ __html: content }}></div>
                </div>
            </div>
        );
    }
}
