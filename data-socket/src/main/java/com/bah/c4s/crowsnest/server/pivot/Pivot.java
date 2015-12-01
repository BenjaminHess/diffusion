package com.bah.c4s.crowsnest.server.pivot;

import java.util.List;
import java.util.Map;

import javax.websocket.Session;

import javolution.util.FastMap;

import org.apache.accumulo.core.data.Range;
import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.Action;

public class Pivot {
  
  public List<Range> list;
  public FastMap<String, List<Action>> flaggers;
  public Session session;
  public JSONObject source;
  public String update;
  public Map<String, JSONObject> returnsMap;
  public Map<String, Long> stitchingMap;
  public String finishedField;
  public List<String> alertFields;
  
  public Pivot(List<Range> range, FastMap<String, List<Action>> flaggers, Session session, JSONObject source, String update,List<String> alertFields){
   this(range,flaggers,session,source,update,alertFields,null);
  }
  public Pivot(List<Range> range, FastMap<String, List<Action>> flaggers, Session session, JSONObject source, String update,List<String> alertFields, Map<String, JSONObject> synchronizedMap){
    this(range,flaggers,session,source,update,alertFields,synchronizedMap,null,null);
  }
  public Pivot(List<Range> range, FastMap<String, List<Action>> flaggers, Session session, JSONObject source, String update,List<String> alertFields, Map<String, JSONObject> synchronizedMap, Map<String, Long> stitchingMap, String finishedField){
    this.list = range;
    this.flaggers = flaggers;
    this.session = session;
    this.source = source;
    this.update = update;
    this.returnsMap = synchronizedMap;
    this.stitchingMap = stitchingMap;
    this.finishedField = finishedField;
    this.alertFields = alertFields;
  }
}
