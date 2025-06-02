import React, { useState } from 'react';
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import { message, Upload, Tooltip, Table } from 'antd';
import { MdDelete } from 'react-icons/md';
import * as XLSX from 'xlsx';

const { Dragger } = Upload;

const FileUploader = ({ actionUrl }) => {
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [columns, setColumns] = useState([]);

  const onRemove = (fileToRemove) => {
    const updatedList = fileList.filter(file => file.uid !== fileToRemove.uid);
    setFileList(updatedList);
  };

  const clearAll = () => {
    setFileList([]);
    setExcelData([]);
    setColumns([]);
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please upload at least one file.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('files', file.originFileObj);
    });

    try {
      const uploadResponse = await fetch(actionUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      message.success('Files processed! Fetching result...');

      // Fetch result.xlsx
      const downloadResponse = await fetch('http://localhost:8000/download');
      if (!downloadResponse.ok) {
        throw new Error('Download failed');
      }

      const blob = await downloadResponse.blob();

      // Read Excel file as ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length > 0) {
        const dynamicColumns = Object.keys(jsonData[0]).map(key => ({
          title: key,
          dataIndex: key,
          key,
        }));
        setExcelData(jsonData);
        setColumns(dynamicColumns);
      }

      // Also trigger download if user wants to keep the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'results.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      message.error('Upload or download failed.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const props = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: () => false,
    onChange(info) {
      setFileList([...info.fileList]);
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
    showUploadList: false,
  };

  return (
    <div className="flex flex-col gap-6 w-full px-4 h-full">
      {/* Upload Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-2/5 flex flex-col gap-4">
          <Dragger {...props} className="bg-white rounded-md">
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">Support for a single or bulk upload. Do not upload sensitive data.</p>
          </Dragger>
          <button
            className={`bg-slate-600 h-12 rounded-xl text-slate-50 flex items-center justify-center gap-2 ${
              fileList.length === 0 || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'
            }`}
            onClick={handleUpload}
            disabled={fileList.length === 0 || loading}
          >
            {loading ? <LoadingOutlined /> : null}
            {loading ? 'Processing...' : 'Get Results'}
          </button>
        </div>

        {/* Upload List */}
        <div className="w-full md:w-3/5 rounded p-4">
          <div className="flex justify-between mb-4">
            {fileList.length > 0 && (
              <button
                className="cursor-pointer bg-blue-800 hover:bg-red-400 py-1 px-4 rounded-3xl text-sm text-slate-100"
                onClick={clearAll}
              >
                Clear All
              </button>
            )}
          </div>

          <ul className="space-y-3 max-h-64 overflow-auto">
            {fileList.map(file => (
              <li
                key={file.uid}
                className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm"
              >
                <div className="truncate w-4/5">
                  <span className="font-medium">{file.name}</span>{' '}
                  <span className="text-gray-500">({file.status || 'ready'})</span>
                </div>
                <Tooltip title="Remove">
                  <MdDelete
                    className="text-blue-500 hover:text-red-400 cursor-pointer text-2xl"
                    onClick={() => onRemove(file)}
                  />
                </Tooltip>
              </li>
            ))}
            {fileList.length === 0 && (
              <li className="text-gray-400 text-lg text-center">No files uploaded.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Excel Table */}
      {excelData.length > 0 && (
        <div className="bg-white rounded shadow p-4 mt-6">
          <h2 className="text-lg font-semibold mb-4">Processed Results</h2>
          <Table
            dataSource={excelData}
            columns={columns}
            rowKey={(record, index) => index}
            scroll={{ x: true }}
          />
        </div>
      )}
    </div>
  );
};

export default FileUploader;
