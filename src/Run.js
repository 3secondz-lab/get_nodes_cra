import React, { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import YAML from 'yamljs';
import _ from 'lodash';
import styled from 'styled-components';
import './reset.scss';

const ros = new ROSLIB.Ros({
  url: 'ws://localhost:9090',
});

function Run() {
  const [nodes, setNodes] = useState([
    {
      Node: '',
      List: [],
    },
  ]);

  const [serverName, setServerName] = useState('');
  const [item, setItem] = useState([]);

  useEffect(() => {
    const resolve = (services) => {
      let apiForm = {
        Node: '',
        List: [],
      };
      let listObj = {};
      const apiList = [];
      let sizeList = [];

      var list_serv = services.filter((serv) => serv.endsWith('/set_parameters'));
      list_serv.forEach(function (item, index, array) {
        var nodeName = item.substring(0, item.length - '/set_parameters'.length) + '/parameter_descriptions';
        var sub = new ROSLIB.Topic({
          ros: ros,
          name: nodeName,
          messageType: 'dynamic_reconfigure/ConfigDescription',
        });

        sub.subscribe(function (message) {
          message.groups[0].parameters.forEach(function (item, index, array) {
            listObj = {};
            const { name, type, level, description, edit_method } = item;
            listObj.Name = name;
            listObj.Type = type;
            listObj.Level = level;
            listObj.Desc = description;
            if (edit_method) {
              // For enum type parameter
              var edit_method_parsed = YAML.parse(edit_method);
              var enum_desc = edit_method_parsed.enum_description;
              //console.log('Enum Desc : ' + enum_desc);
              listObj['Enum Desc'] = enum_desc;
              var enum_val = edit_method_parsed.enum;
              //console.log('Number of enum values : ' + enum_val.length);
              listObj['Number of enum values'] = enum_val.length;
              listObj.Em = true; // Em means edit_nethod, for findkey
              apiForm.List.push(listObj);
              listObj = {};
              enum_val.forEach(function (item, index, array) {
                const { name, type, value, description } = item;
                listObj.Name = name;
                listObj.Type = type;
                listObj.Value = value;
                listObj.Desc = description;
                sizeList.push(listObj);
                // console.log(sizeList);
                _.find(apiForm.List, (o) => o.Em === true).sizeList = sizeList;
                listObj = {};
                // sizeList = [];
              });
            } else {
              // For other types
              var val_max = message['max'][type + 's'].filter((val) => val['name'] === name)[0].value;
              var val_min = message['min'][type + 's'].filter((val) => val['name'] === name)[0].value;
              var val_dflt = message['dflt'][type + 's'].filter((val) => val['name'] === name)[0].value;
              // TODO : Inf / -Inf values are not parsed correctly (from ROS side)
              if (val_max == null) {
                val_max = Infinity;
              }
              if (val_min == null) {
                val_min = -Infinity;
              }
              listObj.Max = val_max;
              listObj.Min = val_min;
              listObj.Default = val_dflt;
              apiForm.List.push(listObj);
              listObj = {};
            }
            sizeList = [];
          });
          apiForm.Node = nodeName;
          apiList.push(apiForm);
          apiForm = {
            Node: '',
            List: [],
          };
          sub.unsubscribe();
          setNodes(apiList);
        });
      });
    };

    const failed = (services) => {
      console.log('Failed to get services : ' + services);
    };

    ros.getServices(
      (services) => resolve(services),
      (services) => failed(services),
    );
  }, []);

  const runRosapi = (type, name, value) => {
    const configData = new ROSLIB.Message({
      [`${type}s`]: [{ name, value }],
    });

    const configReq = new ROSLIB.ServiceRequest({
      config: configData,
    });

    const configService = new ROSLIB.Service({
      ros,
      name: `${serverName}/set_parameters`,
      serviceType: 'dynamic_reconfigure/Reconfigure',
    });

    configService.callService(
      configReq,
      (result) => {
        console.log(result);
      },
      (result) => {
        alert('Failed to reconfigure');
        console.log(result);
      },
    );
  };

  const change = (e) => {
    // const regExp = /^[0-9]*$/;
    const regExp = /^\d+(?:[.]\d+)?$/;
    const idx = e.target.getAttribute('data-idx');
    const dataType = e.target.getAttribute('data-type');
    const dataEm = e.target.getAttribute('data-em');
    const dataName = e.target.name;
    const dataValue = e.target.type === 'checkbox' ? e.target.checked : regExp.test(e.target.value) ? Number(e.target.value) : e.target.value;
    let newData = [...item];
    if (!dataEm) {
      newData[idx].Default = dataValue;
    }
    setItem(newData); // ui를 변화하기 위한 로직은 여기서 끝.

    // ros api 에 전달하는 코드는 여기서부터 시작.
    runRosapi(dataType, dataName, dataValue);
  };

  console.log(nodes);

  return (
    <Wrapper>
      <div className="sidebar">
        <ul>
          {nodes.map((v, i, t) => (
            <li
              key={i}
              onClick={() => {
                setServerName(`/${v.Node.split('/')[1]}`);
                setItem(v.List);
              }}
            >
              {v.Node}
            </li>
          ))}
        </ul>
      </div>
      <div className="show-content">
        <h1>{serverName}</h1>
        <ul>
          {item.map((v, i) => (
            <li key={i}>
              <dl>
                <dt>{v.Name}</dt>
                <dd>
                  {v.Type === 'str' && <input type="text" name={v.Name} data-idx={i} data-type={v.Type} value={v.Default} onChange={change} />}
                  {v.Type === 'double' && (
                    <p className="wrap-item">
                      <span>{v.Min}</span>
                      <input type="range" name={v.Name} data-idx={i} data-type={v.Type} value={v.Default} min={v.Min} max={v.Max} onChange={change} />
                      <span>{v.Max}</span>
                      <input type="number" name={v.Name} data-idx={i} data-type={v.Type} step="0.1" value={v.Default} onChange={change} />
                    </p>
                  )}
                  {v.Type === 'bool' && <input type="checkbox" data-type={v.Type} name={v.Name} data-idx={i} checked={v.Default} onChange={change} />}
                  {v.Type === 'int' && !v.Em && (
                    <p className="wrap-item">
                      <span>{v.Min}</span>
                      <input type="range" name={v.Name} data-idx={i} data-type={v.Type} value={v.Default} min={v.Min} max={v.Max} onChange={change} />
                      <span>{v.Max}</span>
                      <input type="number" name={v.Name} data-idx={i} data-type={v.Type} step="1" value={v.Default} onChange={change} />
                    </p>
                  )}
                  {v.Type === 'int' && v.Em && (
                    <select onChange={change} data-type={v.Type} name={v.Name} data-em={true}>
                      {v.sizeList.map((v, i) => (
                        <option key={i} value={v.Value}>
                          {v.Name} ({v.Value})
                        </option>
                      ))}
                    </select>
                  )}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  padding: 1.5rem;
  display: flex;
  width: 90%;
  height: auto;
  min-height: 50vh;
  flex-direction: row;
  place-content: flex-start;
  justify-content: flex-start;
  align-items: stretch;
  margin: 0 auto;
  border: 1px solid #f60;
  .sidebar {
    width: 30%;
    ul {
      width: 100%;
      overflow: hidden;
      li {
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
        font-size: 2rem;
      }
    }
  }
  .show-content {
    width: 70%;
    input[type='text'],
    input[type='number'] {
      border: 1px solid #000;
    }
    h1 {
      text-align: center;
      margin: 0 0 4rem 0;
    }
    dl {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-content: center;
      margin: 0 0 2rem 0;
      dt {
        flex: 1 0 25%;
        font-size: 1.6rem;
      }
      dd {
        flex: 0 0 75%;
        width: 100%;
        .wrap-item {
          width: 100%;
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-content: center;
          span {
            width: 15%;
            font-size: 1.4rem;
            text-align: center;
          }
          input[type='number'] {
            width: 20%;
            align-self: flex-end;
            margin-left: auto;
            margin-right: 2rem;
          }
          input[type='range'] {
            cursor: pointer;
          }
        }
        select {
          border: 1px solid #000;
          cursor: pointer;
        }
      }
    }
  }
`;

export default Run;
