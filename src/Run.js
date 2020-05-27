import React, { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import YAML from 'yamljs';
import _ from 'lodash';
import styled from 'styled-components';

function Run() {
  const [nodes, setNodes] = useState([
    {
      Name: '',
      List: [],
    },
  ]);

  const [contentList, setContentList] = useState(nodes);
  const [item, setItem] = useState([]);

  useEffect(() => {
    const ros = new ROSLIB.Ros({
      url: 'ws://localhost:9090',
    });

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
        var name = item.substring(0, item.length - '/set_parameters'.length) + '/parameter_descriptions';
        var sub = new ROSLIB.Topic({
          ros: ros,
          name: name,
          messageType: 'dynamic_reconfigure/ConfigDescription',
        });
        sub.subscribe(function (message) {
          // console.log(message.groups.length);
          apiForm.Node = name;

          message.groups[0].parameters.forEach(function (item, index, array) {
            const { name, type, level, description, edit_method } = item;
            //console.log(`Name : ${name} , Type :  ${type}, Level :  ${level}, Desc : ${description}`);
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
                //console.log('Name : ' + name + ', Type : ' + type + ', Value : ' + value + ', Desc : ' + description)
                listObj.Name = name;
                listObj.Type = type;
                listObj.Value = value;
                listObj.Desc = description;
                sizeList.push(listObj);
                _.find(apiForm.List, (o) => o.Em === true).sizeList = sizeList;
                listObj = {};
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
              //console.log('Max : ' + val_max + ', Min : ' + val_min + ', Default : ' + val_dflt)
              listObj.Max = val_max;
              listObj.Min = val_min;
              listObj.Default = val_dflt;
              apiForm.List.push(listObj);
              listObj = {};
            }
            sizeList = [];
          });
          sub.unsubscribe();
          apiList.push(apiForm);
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

  // 이벤트(onDrag 혹은 onChange 등) 발생했을 때 해당 값을 넘기는 함수들을 만들어야 함.
  const change = (e) => {
    const idx = e.target.getAttribute('data-idx');
    const regExp = /^[0-9]*$/;
    let newData = [...item];
    newData[idx].Default = regExp.test(e.target.value) ? Number(e.target.value) : e.target.value;
    setItem(newData);
  };

  return (
    <Wrapper>
      <div className="sidebar">
        <ul>
          {nodes.map((v, i, t) => (
            <li
              key={i}
              onClick={() => {
                setContentList(t);
                setItem(v.List);
              }}
            >
              {v.Node}
            </li>
          ))}
        </ul>
      </div>
      <div className="show-content">
        {contentList.map((v, i) => (
          <div key={i}>
            <h1>{v.Node}</h1>
            {item.map((v, i) => (
              <p key={i}>
                {v.Name}
                {v.Type === 'str' && <input type="text" name={v.Name} data-idx={i} value={v.Default} onChange={change} />}
                {v.Type === 'double' && (
                  <>
                    <span>{v.Min}</span>
                    <input type="range" name={v.Name} data-idx={i} value={v.Default} min={v.Min} max={v.Max} onChange={change} />
                    <span>{v.Max}</span>
                    <input type="number" name={v.Name} data-idx={i} step="0.1" value={v.Default} onChange={change} />
                  </>
                )}
              </p>
            ))}
          </div>
        ))}
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.div``;

export default Run;
