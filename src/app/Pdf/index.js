import React, { Component } from 'react';
import styles from './index.scss';
import html2canvas from 'html2canvas';
import { jsPDF } from "jspdf";
import { UrlUtil } from '../../utils/utils';


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
        let scriptElements = document.querySelectorAll('.render-container script');
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
                url: `${window.__STATICPATH}/tpl/tpl_1.html`,
                success: ret => resolve(ret),
                error: e => reject(),
            });
        });
    }
    // 请求数据
    getData() {
        let {orderId, salt} = this.state;

        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${window.__API || ''}/qf-admin/c/onlineReport/getData?orgOrderId=${orderId}&csrfPreventionSalt=${salt}`,
                dataType: 'json',
                success: ret => {
                    if(ret.success) {
                        return resolve(ret?.data || {});
                    }
                    resolve({});
                },
                error: e => resolve({}),
            });
        });
    }

    // 初始化页面，请求模板、请求数据
    initHome() {
        this.setState({ loading: true });
        Promise.all([this.getData(), this.getTpl()]).then(([templateData, tpl]) => {
            window.SHAREHOLDER = templateData?.SHAREHOLDER || [];

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

                    this.handleRender();
                }, 2000);
            });

        }).catch(e => {
            this.setState({ loading: false });
        });
    }

    // 分割表格
    splitTableByHeight(tableElement, maxHeights) {
        let maxHeight = 0,
            rows = tableElement.rows,
            currentHeight = 0,
            currentTable = null,
            currentRowIndex = 0,
            // 创建一个新的 div 容器来存放拆分后的表格
            tableContainer = document.createDocumentFragment(),
            endDiv = document.createElement('div'),
            // 获取原始表格的 thead 元素
            tableTHead = null,
            tableTBody = null,
            rowLength = rows.length;

        endDiv.setAttribute('class', 'end');

        for (let i = 0; i < rows.length; i++) {
            let row = rows[i],
                rowHeight = row.offsetHeight;

            if (!currentTable || currentHeight + rowHeight > maxHeight) {
                currentTable = tableElement.cloneNode(false); // 克隆表格的结构，不包含内容，只是个table标签

                tableContainer.appendChild(currentTable);
                // 既然table都需要拆成多份了，说明遇到了分页，所以这里需要插入一个分页
                // maxHeights如果还有值说明table还没有分割完，就需要插入新的一页，否则最后的那个table不需要插入end标志
                if(maxHeights?.length) {
                    tableContainer.appendChild(endDiv.cloneNode(true));
                }

                tableTBody = null;
                currentHeight = 0;

                maxHeight = maxHeights.shift();
            }

            if(row.parentNode.tagName.toLowerCase() === 'thead') {
                let tableTHeadEle = row.parentNode.cloneNode(true);

                // 拷贝thead，需要有内容
                tableTHead = tableTHeadEle.cloneNode(true);
                currentTable.appendChild(tableTHead);
            }else{
                //
                if(row.parentNode.tagName.toLowerCase() === 'tbody') {
                    if(!tableTBody) {
                        tableTBody = row.parentNode.cloneNode(false);
                    }
                }

                // 会出现单元格超高的情况，此时需要拆分单元格为多个table
                if(false && rowHeight >= maxHeight) {
                    let lineCharCount = 6,
                        lineHeight = 9,
                        cell = row.cells,
                        rows = [];

                    for(let j=0;j<cell.length;j++) {

                    }
                }else{
                    tableTBody.appendChild(row.cloneNode(true));
                }

                if(!currentTable.querySelector('thead') && tableTHead && false) {
                    // 表头不需要每次都添加，TODO
                    let o = tableTHead.cloneNode(true);
                    currentTable.appendChild(o);
                }
                currentTable.appendChild(tableTBody);
            }

            // 更新当前表格的高度和行索引
            currentHeight += rowHeight;
        }

        let tempDiv = document.createElement('div');
        tempDiv.appendChild(tableContainer.cloneNode(true));
        let html = tempDiv.innerHTML;

        tableElement.insertAdjacentHTML('afterend', html);

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

    handleRender() {
        let index = 0,
            currentSum = 0,
            currentPage = null,
            pageHeight = 842,
            pageHeaderHeight = 36,
            pageFooterHeight = 42,
            pageContentHeight = pageHeight - pageHeaderHeight - pageFooterHeight,
            loopLimit = 1000;

        while($('.render-container').children()[index] && loopLimit >= 0) {
            let ele = $('.render-container').children();
            // 避免死循环
            loopLimit--;

            // 如果本身就是page页面，那么就直接复制页面
            if(ele[index].classList.contains('page')) {
                let node = ele[index].cloneNode(true);
                node.classList.add('origin-page');
                document.querySelector('.pages').appendChild(node);

                index++;
                currentPage = null;
                currentSum = 0;
                continue;
            }else if(ele[index].classList.contains('end')) {
                index++;
                currentPage = null;
                currentSum = 0;
                continue;
            }else if(['STYLE', 'SCRIPT'].includes(ele[index].tagName)){
                index++;
                continue;
            }

            // 包括border和padding
            let currentHeight = ele[index].offsetHeight;

            if(currentSum + currentHeight <= pageContentHeight) {
                // 元素追加到page里
                if(!currentPage) {
                    currentPage = this.createPage();
                }

                currentPage.appendChild(ele[index].cloneNode(true));

                currentSum += currentHeight;
                index++;
            }else{
                // 拆分元素，不用记录
                // currentSum有可能正好为0，
                if(ele[index].tagName.toLowerCase() === 'table') {
                    let firstTableHeight = pageContentHeight - currentSum,
                        tableCount = parseInt((currentHeight - firstTableHeight)/pageContentHeight),
                        otherHeight = tableCount ? (new Array(tableCount)).fill(pageContentHeight-12) : [],
                        heights = [firstTableHeight].concat(otherHeight);

                    // 会出现一种情况，table的高度过小，此时就不用拆分table，直接新建一页即可
                    let trHeight = ele[index].rows[0]?.offsetHeight || 24,
                        condition1 = firstTableHeight <= trHeight && !tableCount,
                        condition2 = firstTableHeight + 1 <= currentHeight && !tableCount; //

                    if(condition1) {
                        currentPage = null;
                        currentSum = 0;
                    }else if(condition2) {
                        let lastIndex = ele[index].rows.length-1,
                            lastTrHeight = ele[index].rows[lastIndex]?.offsetHeight || 0;

                        if(lastTrHeight) {
                            let h = [firstTableHeight - lastTrHeight];
                            this.splitTableByHeight(ele[index], h);
                        }else{
                            currentPage = null;
                            currentSum = 0;
                        }
                    }else{
                        this.splitTableByHeight(ele[index], heights);
                    }
                }else{
                    // 重置page
                    // 只要 currentSum + currentHeight <= 762且当前元素不是table，说明一个page已经填充完毕
                    currentPage = null;
                    currentSum = 0;
                }
            }
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
            { name } = this.state,
            removeLastPage = false;

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
    // 图片导出成PDF
    export2() {
        let sections = [];
        function html2pdf(section, index) {
            return new Promise((resolve, reject) => {
                html2canvas(section).then((canvas) => {
                    var imageData = canvas.toDataURL("image/jpeg", 1.0),
                        secHeight = section.clientHeight;

                    index && doc.addPage(); // 添加一页，一个section一页
                    doc.addImage(imageData, "JPEG", padding, padding, contentWidth * scaleFactor, secHeight * scaleFactor);

                    resolve();
                });
            });
        }
        // 因为页面是由多个section组成的，所以需要把这些section分别放到每一页上
        async function executePromisesInOrder(sections) {
            for (let i = 0; i < sections.length; i++) {
                await html2pdf(sections[i], i);
            }
        }

        // 执行导出
        executePromisesInOrder(sections).then(() => {
            let { name } = this.state;

            doc.save(`${name || 'export'}.pdf`);
            this.setState({ exporting: false });
        }).catch(e => {
            this.setState({ exporting: false });
            console.log(`Error: `, e);
        })
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


                <div className={`pages`}></div>
                <div className={`render-container ${styles['render-container']}`} dangerouslySetInnerHTML={{ __html: content }}></div>
            </div>
        );
    }
}
