import React, {useEffect} from 'react';
//import eventemitter2 from 'eventemitter2';
import ROSLIB from 'roslib';
import YAML from 'yamljs';
import _ from 'lodash';

function App() {
  useEffect(() => {
    const ros = new ROSLIB.Ros({
      url: 'ws://localhost:9090'
    });
    
    let apiForm = {
      Node : '',
      List : []
    };
    let listObj = {};
    const apiList = [];
    let sizeList = [];
    
    // ROS API to get list of services
    ros.getServices(
      // Success, callback
      function(services) {
        // Get dynamic_reconfigurable nodes
        var list_serv = services.filter(serv => serv.endsWith('/set_parameters'))
    
        // Get parameter information for each node
        list_serv.forEach(function (item, index, array){
          // Convert service name to topic name
          var name = item.substring(0, item.length - '/set_parameters'.length) + '/parameter_descriptions'
          // Get parameter configuration topic
          var sub = new ROSLIB.Topic({
            ros: ros,
            name: name,
            messageType: 'dynamic_reconfigure/ConfigDescription'
          })
    
          // Parse configuration
          sub.subscribe(function (message){
            console.log(message.groups.length);
            apiForm.Node = name;
    
            // TODO : Check multiple groups possibility
            message.groups[0].parameters.forEach(function (item, index, array){
              const {name, type, level, description, edit_method} = item;
              //console.log(`Name : ${name} , Type :  ${type}, Level :  ${level}, Desc : ${description}`);
              listObj.Name = name;
              listObj.Type = type;
              listObj.Level = level;
              listObj.Desc = description;
    
              if (edit_method){
                // For enum type parameter
                var edit_method_parsed = YAML.parse(edit_method);
    
                var enum_desc = edit_method_parsed.enum_description
    
                //console.log('Enum Desc : ' + enum_desc);
                listObj['Enum Desc'] = enum_desc;
                
                var enum_val = edit_method_parsed.enum
                //console.log('Number of enum values : ' + enum_val.length);
                listObj['Number of enum values'] = enum_val.length;
                listObj.Em = true; // Em means edit_nethod, for findkey
                apiForm.List.push(listObj);
                listObj = {};
    
                enum_val.forEach(function (item, index, array){
                  const {name, type, value, description} = item;
    
                  //console.log('Name : ' + name + ', Type : ' + type + ', Value : ' + value + ', Desc : ' + description)
                  listObj.Name = name;
                  listObj.Type = type;
                  listObj.Value = value;
                  listObj.Desc = description;
                  sizeList.push(listObj);
                  _.find(apiForm.List, (o) => (o.Em === true)).sizeList = sizeList;
                  listObj = {};
                })
              } else {
                // For other types
                var val_max = message['max'][type + 's'].filter(val => val['name'] === name)[0].value
                var val_min = message['min'][type + 's'].filter(val => val['name'] === name)[0].value
                var val_dflt = message['dflt'][type + 's'].filter(val => val['name'] === name)[0].value
    
                // TODO : Inf / -Inf values are not parsed correctly (from ROS side)
                if(val_max == null){
                  val_max = Infinity
                }
    
                if(val_min == null){
                  val_min = -Infinity
                }
    
                //console.log('Max : ' + val_max + ', Min : ' + val_min + ', Default : ' + val_dflt)
                listObj.Max = val_max;
                listObj.Min = val_min;
                listObj.Default = val_dflt;
                apiForm.List.push(listObj);
                listObj = {};
              }
              sizeList = [];
            })
            sub.unsubscribe();
            apiList.push(apiForm);
            console.log(apiList);
          })
        });
        
      },
      // Failure, failedCallback
      function(services) {
        console.log('Failed to get services : ' + services)
      }
    );
  }, [])
  return (
    <div className="App">
      <ul>
  <li>title : {}</li>
      </ul>
    </div>
  );
}

export default App;
