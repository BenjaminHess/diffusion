package com.bah.c4s.crowsnest.server.pivot;

import java.util.LinkedList;
import java.util.List;
import java.util.Map.Entry;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.SynchronousQueue;


import javolution.util.FastMap;

import org.apache.accumulo.core.client.BatchScanner;
import org.apache.accumulo.core.client.Connector;
import org.apache.accumulo.core.client.TableNotFoundException;
import org.apache.accumulo.core.data.Key;
import org.apache.accumulo.core.data.Range;
import org.apache.accumulo.core.data.Value;
import org.apache.accumulo.core.security.Authorizations;
import org.apache.hadoop.io.Text;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.Action;
import com.bah.c4s.crowsnest.action.alert.Alert;

public class PivotThread implements Runnable {
	private static final String EVENTTABLE = "Event";
	private SynchronousQueue<Pivot> pullQueue;
	private BatchScanner eventScanner;

	public PivotThread(SynchronousQueue<Pivot> queue, Connector conn, Authorizations auths)
			throws TableNotFoundException {
		this.pullQueue = queue;
		this.eventScanner = conn.createBatchScanner(EVENTTABLE, auths, 10);
	}


	@Override
	public void run() {
		while (true) {
			Pivot pivot;

			try {
				pivot = this.pullQueue.take();
				if(pivot.stitchingMap == null){
					normalPivot(pivot);
				}
				else {
					stitchingPivot(pivot);
				}
			} catch (InterruptedException e) {
				e.printStackTrace();
				continue;
			}
		}
	}

	@SuppressWarnings("unchecked")
	private void stitchingPivot(Pivot pivot){

		this.eventScanner.clearColumns();
		for (String s : getFieldNames((JSONArray) pivot.source.get("fields"))) {
			this.eventScanner.fetchColumnFamily(new Text(s));
		}
		
		this.eventScanner.setRanges(pivot.list);
		JSONObject returnJson = new JSONObject();
		// Prepare return
		returnJson.put("command", "TABLE_APPEND");
		String dataSource = pivot.source.get("source").toString();
		returnJson.put("table", dataSource);

		FastMap<String, JSONObject> rowMap = new FastMap<String, JSONObject>();
		for (Entry<Key, Value> entry : eventScanner) {
			String rowId = entry.getKey().getRow().toString();
			if (!rowMap.containsKey(rowId)) {
				rowMap.put(rowId, new JSONObject());
				rowMap.get(rowId).put("rowId",rowId);
			}
			String cf = entry.getKey().getColumnFamily().toString();
			if(cf.equals(pivot.finishedField)){  
				rowMap.get(rowId).put("stitchTimeStamp",entry.getKey().getTimestamp());
			}
			rowMap.get(rowId).put(cf,entry.getValue().toString());
		}

		for(Entry<String, JSONObject> e : rowMap.entrySet()){
			JSONObject json = e.getValue();
			String rowId = json.get("rowId").toString();

			Object f = json.get(pivot.finishedField);
			if(f == null){
				pivot.stitchingMap.remove(rowId);
				continue;
			}      

			Long timeStamp = (Long)json.get("stitchTimeStamp");
			Long lastUpdate = pivot.stitchingMap.get(rowId);
			if(lastUpdate == null || !(timeStamp > lastUpdate)){
				rowMap.remove(rowId);
			}
			else{
				json.remove("stitchingTimeStamp");

				if(!f.toString().equals("Start") && lastUpdate != -1L){
					json.put("update", "stitching");
				} 
				else {
					json.put("update", pivot.update);
				}

				pivot.stitchingMap.put(rowId, timeStamp);
				if(f.toString().equals("Closed")){
					pivot.stitchingMap.remove(rowId);
				}

			}
		}

		JSONArray largeArray = runActions(pivot.flaggers, rowMap, pivot.alertFields, dataSource);
		//Package rows into return object
		returnJson.put("data", largeArray);

		//Send Data
		if(pivot.session.isOpen() && largeArray.size() > 0) {
			String s = returnJson.toJSONString();
			pivot.session.getAsyncRemote().sendText(returnJson.toJSONString());
		}
	}

	@SuppressWarnings("unchecked")
	private void normalPivot(Pivot pivot){
		int returns = -1;

		//Create new map for comment pivot list: CommentID, Index of parent event in return JSON
		LinkedList<Range> commentList = new LinkedList<Range>();

		//Clear columns from previous pivot
		this.eventScanner.clearColumns();

		//Add only fields requested to scanner
		for (String s : getFieldNames((JSONArray) pivot.source.get("fields"))) {
			this.eventScanner.fetchColumnFamily(new Text(s));
		}
		this.eventScanner.setRanges(pivot.list);
		
		// Prepare return
		JSONObject returnJson = new JSONObject();
		returnJson.put("command", "TABLE_APPEND");
		String dataSource = pivot.source.get("source").toString();
		returnJson.put("table", dataSource);
		
		//Fetch and construct rows to return
		FastMap<String, JSONObject> rowMap = new FastMap<String, JSONObject>();
		for (Entry<Key, Value> entry : eventScanner) {
			String rowId = entry.getKey().getRow().toString();
			if (!rowMap.containsKey(rowId)) {
				JSONObject newRow = new JSONObject();
				newRow.put("rowId",rowId);
				newRow.put(Alert.HIGHEST_ALERT, "");
				newRow.put("Comments", new JSONArray());
				rowMap.put(rowId, newRow);
				returns++;
			}
			//If comment add to comment fetch list
			String CF = entry.getKey().getColumnFamily().toString();
			if (CF.equals("comment")) {
				String commentID = entry.getKey().getColumnQualifier().toString();
				commentList.add(new Range(commentID));
			}
			else {
				rowMap.get(rowId).put(entry.getKey().getColumnFamily().toString(),entry.getValue().toString());
			}
		}
		
		//Pivot and fetch comments	
		if(commentList.size() > 0){
			//Clear scanner
			eventScanner.clearColumns();
			eventScanner.setRanges(commentList);
			String commentID = "";
			JSONObject commentJson = new JSONObject();
			for (Entry<Key, Value> entry : eventScanner) {
				if(!commentID.equals(entry.getKey().getRow().toString()) && !commentID.equals("")){
					String eventID = commentJson.get("EventID").toString();
					JSONArray commentArray = (JSONArray) rowMap.get(eventID).get("Comments");
					commentArray.add(commentJson);
					commentJson = new JSONObject();
				}
				commentJson.put(entry.getKey().getColumnFamily().toString(),entry.getValue().toString());
				commentID = entry.getKey().getRow().toString();
			}
			String eventID = commentJson.get("EventID").toString();
			JSONArray commentArray = (JSONArray) rowMap.get(eventID).get("Comments");
			commentArray.add(commentJson);
		}
		
		//Run Actions: Alerts, Filters, Etc.
		JSONArray largeArray = runActions(pivot.flaggers, rowMap, pivot.alertFields, dataSource);
		returns = largeArray.size();
		
		//Package rows into return object
		returnJson.put("data", largeArray);

		//Send Data
		if(pivot.session.isOpen() && returns > 0) {
			//Get future to wait for data transfer to be complete
			Future<Void> f = pivot.session.getAsyncRemote().sendText(returnJson.toJSONString());
			try {
				if(f != null){
					f.get();
				}
			} catch (NullPointerException | InterruptedException | ExecutionException e) {
				//TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		
		//Post return amount to subQuery
		if(pivot.returnsMap != null){
			pivot.returnsMap.put(pivot.list.get(0).toString(), returnJson);
		}
	}

	private JSONArray runActions(FastMap<String,List<Action>> actions, FastMap<String, JSONObject> rowMap, List<String> alertFields, String dataSource){
		JSONArray largeArray = new JSONArray();
		for (JSONObject row : rowMap.values()) {
			boolean add = true;
			boolean alertOverride = false;
			for (String s : alertFields) {
				List<Action> list = actions.get(row.get(s).toString());
				if(list == null){
					continue;
				}
				for(Action action : list){

					if(action != null){
						switch(action.process(row, dataSource)){

						case ALERT: //Update Alert Info for this row
						((Alert) action).updateAlerts(row);
						alertOverride = true;
						break;

						case HIGHLIGHT: //Nothing Currently
							break;

						case NONE: //Only add to return Array
							break;

						case REMOVE: //TODO: Add information to returned about filtered information/count
							add = false;
							break;

						default:
							break;
						}
					}
				}
			}
			if(alertOverride || add){  
				largeArray.add(row);
			}
		}
		return largeArray;
	}
	
	private List<String> getFieldNames(JSONArray json){
		List<String> fields = new LinkedList<String>();
		for(Object o : json){
			JSONObject j = (JSONObject) o;
			fields.add(j.get("AccumuloName").toString());
		}
		fields.add("comment");
		return fields;
	}
}












