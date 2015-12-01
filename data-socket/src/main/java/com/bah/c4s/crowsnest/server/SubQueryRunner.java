package com.bah.c4s.crowsnest.server;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.SynchronousQueue;

import javax.websocket.Session;

import javolution.util.FastMap;


import org.apache.accumulo.core.client.BatchScanner;
import org.apache.accumulo.core.client.Connector;
import org.apache.accumulo.core.client.TableNotFoundException;
import org.apache.accumulo.core.data.Key;
import org.apache.accumulo.core.data.Value;
import org.apache.accumulo.core.security.Authorizations;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.apache.accumulo.core.data.Range;

import com.bah.c4s.crowsnest.action.Action;
import com.bah.c4s.crowsnest.server.pivot.Pivot;
import com.bah.c4s.utils.EdgeTableRangeGenerator;

public class SubQueryRunner implements Runnable {

	private static final String EDGETABLE = "EdgeTable";
	private static final int RETURN_AMMOUNT_LOW = 100;
	private static final int RETURN_AMMOUNT_MED = 2_000;
	private static final int RETURN_AMMOUNT_HIGH = 5_000;

	private static final long LOW_THRESHOLD = 2_000;
	private static final long MED_THRESHOLD = 15_000;
	private SynchronousQueue<Pivot> rangeQueue;
	private Session session;
	private JSONObject queryParams;
	private JSONObject source;
	private BatchScanner edgeScanner;

	//private long returns;
	private long returnStartTime;
	private SimpleDateFormat parserSDF = new SimpleDateFormat("MM/dd/yyyy HH:mm:ss");
	private FastMap<String, List<Action>> actions;

	private boolean stopQuery;
	private String queryType;

	public SubQueryRunner(Session session, JSONObject query, JSONObject source, Connector conn, SynchronousQueue<Pivot> queue, FastMap<String, List<Action>> actions, String queryType) {
		this.queryParams = query;
		this.session = session;
		this.source = source;
		this.rangeQueue = queue;
		this.queryType = queryType;
		this.actions = actions;
		try {
			Authorizations auths = new Authorizations("Belvedere");
			edgeScanner = conn.createBatchScanner(EDGETABLE, auths, 10);

		} catch (TableNotFoundException e) {
			e.printStackTrace();
		}
	}

	public void shutdown(){
		stopQuery = true;
	}

	private void runContinuous(List<Range> ranges){
		stopQuery = false;
		FastMap<String, Long> historical =  new FastMap<String, Long>();
		String updates = "false";
		int edges = 0;
		int returnSize = RETURN_AMMOUNT_LOW;
		long startDate;
		try {
			startDate = parserSDF.parse(queryParams.get("sdate").toString()).getTime();
		} catch (ParseException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
			return;
		}
		while(!stopQuery){
			try {
				if(!session.isOpen()){
					break;
				}


				long scanPoint = System.currentTimeMillis();
				edgeScanner.setRanges(ranges);
				returnStartTime = System.currentTimeMillis();
				LinkedList<Range> keys = new LinkedList<Range>();
				for( Entry<Key, Value> entry : edgeScanner) {

					String rowId = entry.getKey().getRow().toString();
					String value = entry.getValue().toString();

					//Filter on time from rowID
					if(filterTime(rowId, startDate)){

						if(!historical.containsKey(value)){
							historical.put(value, getEdgeTime(rowId));
							keys.add(new Range(entry.getValue().toString()));
							edges++;
							//Check if enough keys have been collected to kick off a pivot 
							if (keys.size() >= returnSize) {
								//Create and submit pivot to queue
								rangeQueue.put(new Pivot((LinkedList<Range>) keys.clone(), this.actions, this.session, this.source,updates,getAlertFields(this.source)));

								if(edges > LOW_THRESHOLD){
									returnSize = RETURN_AMMOUNT_MED;
								}
								if(edges > MED_THRESHOLD){
									returnSize = RETURN_AMMOUNT_HIGH;
								}
								if(updates.equals("true")){
									returnSize = 10;
								}
								keys.clear();
							}
						}
					}
				}
				if(keys.size() > 0){
					rangeQueue.put(new Pivot((LinkedList<Range>) keys.clone(), this.actions, this.session, this.source,updates,getAlertFields(this.source)));
				}
				startDate = scanPoint - 60_000;
				keys.clear();
				for(Entry e : historical.entrySet()){
					if(startDate - (Long)(e.getValue()) >= 180_000){
						historical.remove(e.getKey());
					}
				}
				long timeRan = System.currentTimeMillis() - scanPoint;
				if(timeRan <= 1000){
					Thread.sleep(1000 - timeRan);
				}
				updates = "true";
			} catch (IllegalArgumentException e) {
				//TODO: Send Error Message Back
				e.printStackTrace();
			} catch (InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		closeScanners();
	}
	private void runStitching(List<Range> ranges){
		stopQuery = false;
		String updates = "false";
		FastMap<String, Long> historical =  new FastMap<String, Long>();
		Map<String, Long> stitchingMap = Collections.synchronizedMap(new HashMap<String, Long>());
		int edges = 0;
		int returnSize = RETURN_AMMOUNT_LOW;
		long startDate;
		long endDate;
		try {
			startDate = parserSDF.parse(queryParams.get("sdate").toString()).getTime();
			endDate = parserSDF.parse(queryParams.get("edate").toString()).getTime();
		} catch (ParseException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
			return;
		}
		while(!stopQuery){
			try {
				if(!session.isOpen()){
					break;
				}

				long scanPoint = System.currentTimeMillis();
				edgeScanner.setRanges(ranges);
				returnStartTime = System.currentTimeMillis();
				LinkedList<Range> keys = new LinkedList<Range>();

				synchronized (stitchingMap) {
					for(String key : stitchingMap.keySet()){
						keys.add(new Range(key));
					}
				}
				if (keys.size() > 0) {
					//Create and submit pivot to queue
					rangeQueue.put(new Pivot((LinkedList<Range>) keys.clone(), this.actions, this.session, this.source,updates,getAlertFields(this.source),null,stitchingMap,"flowStatus"));
					keys.clear();
				}

				for( Entry<Key, Value> entry : edgeScanner) {

					String rowId = entry.getKey().getRow().toString();
					String value = entry.getValue().toString();

					//Filter on time from rowID
					if(filterTime(rowId, startDate, endDate)){

						if(!historical.containsKey(value)){
							historical.put(value, getEdgeTime(rowId));
							stitchingMap.put(value, -1L);
							keys.add(new Range(value));

							edges++;
							//Check if enough keys have been collected to kick off a pivot 
							if (keys.size() >= returnSize) {
								//Create and submit pivot to queue
								rangeQueue.put(new Pivot((LinkedList<Range>) keys.clone(), this.actions, this.session, this.source,updates,getAlertFields(this.source),null,stitchingMap,"flowStatus"));

								if(edges > LOW_THRESHOLD){
									returnSize = RETURN_AMMOUNT_MED;
								}
								if(edges > MED_THRESHOLD){
									returnSize = RETURN_AMMOUNT_HIGH;
								}
								keys.clear();
							}
						}
					}
				}
				if(keys.size() > 0){
					rangeQueue.put(new Pivot((LinkedList<Range>) keys.clone(), this.actions, this.session, this.source,updates,getAlertFields(this.source),null,stitchingMap,"flowStatus"));
				}
				updates = "true";
				startDate = scanPoint - 60_000;
				keys.clear();
				for(Entry e : historical.entrySet()){
					if(startDate - (Long)(e.getValue()) >= 180_000){
						historical.remove(e.getKey());
					}
				}
				long timeRan = System.currentTimeMillis() - scanPoint;
				if(timeRan <= 1000){
					Thread.sleep(1000 - timeRan);
				}
			} catch (IllegalArgumentException e) {
				//TODO: Send Error Message Back
				e.printStackTrace();
			} catch (InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		closeScanners();
	}


	@SuppressWarnings("unchecked")
	private void getEdges(List<Range> ranges) {
		try {
			FastMap<String, Long> historical =  new FastMap<String, Long>();
			int returnSize = RETURN_AMMOUNT_LOW;
			int edges = 0;
			long startDate = parserSDF.parse(queryParams.get("sdate").toString()).getTime();
			long endDate =  parserSDF.parse(queryParams.get("edate").toString()).getTime();
			Map<String, JSONObject> pivotMap = Collections.synchronizedMap(new HashMap<String, JSONObject>());
			edgeScanner.setRanges(ranges);

			returnStartTime = System.currentTimeMillis();
			LinkedList<Range> keys = new LinkedList<Range>();
			for( Entry<Key, Value> entry : edgeScanner) {
				String rowId = entry.getKey().getRow().toString();
				String value = entry.getValue().toString();

				if(filterTime(entry.getKey().getRow().toString(), startDate, endDate)){
					if(!historical.containsKey(value)){
						historical.put(value, getEdgeTime(rowId));
						keys.add(new Range(entry.getValue().toString()));
						edges++;
						if (keys.size() >= returnSize) {
							pivotMap.put(keys.getFirst().toString(), null);
							rangeQueue.put(new Pivot((LinkedList<Range>) keys.clone(), this.actions, this.session, this.source, "false",getAlertFields(this.source), pivotMap));
							if(edges > LOW_THRESHOLD){
								returnSize = RETURN_AMMOUNT_MED;
							}
							if(edges > MED_THRESHOLD){
								returnSize = RETURN_AMMOUNT_HIGH;
							}
							keys.clear();
						}
					}
				}
			}
			if(keys.size() > 0){
				rangeQueue.put(new Pivot((LinkedList<Range>) keys.clone(), this.actions, this.session, this.source, "false",getAlertFields(this.source),pivotMap));
			}
			closeQuery(edges, pivotMap);
		} catch (IllegalArgumentException | ParseException e) {
			//TODO: Send Error Message Back
			e.printStackTrace();
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	private void getAnalytics() {
		try {
			SimpleDateFormat idSDF = new SimpleDateFormat("yyyyMMdd");
			Date startDate = parserSDF.parse(queryParams.get("sdate").toString());
			Date endDate =  parserSDF.parse(queryParams.get("edate").toString());

			String source = this.source.get("source").toString();
			String header = "ANALYTICRESULTS_" + source + "_";

			LinkedList<Range> keys = new LinkedList<Range>();


			Calendar c = Calendar.getInstance();
			c.setTime(startDate);
			while(c.getTime().before(endDate)){
				String startRowID = header + idSDF.format(c.getTime()) + "_" + c.getTimeInMillis();
				c.add(Calendar.HOUR_OF_DAY, 1);
				String endRowID = header + idSDF.format(c.getTime()) + "_" + c.getTimeInMillis();
				keys.add(new Range(startRowID,endRowID));
			}

			Map<String, JSONObject> pivotMap = Collections.synchronizedMap(new HashMap<String, JSONObject>());
			returnStartTime = System.currentTimeMillis();

			for(int i = 0; i<keys.size(); i++){
				pivotMap.put(keys.get(i).toString(), null);
				rangeQueue.put(new Pivot( keys.subList(i, i+1), this.actions, this.session, this.source, "false",getAlertFields(this.source), pivotMap));
			}

			closeQuery(1, pivotMap);
		} catch (IllegalArgumentException | ParseException e) {
			//TODO: Send Error Message Back
			e.printStackTrace();
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	@SuppressWarnings("unchecked")
	private void closeQuery(int edges, Map<String, JSONObject> pivotMap){
		closeScanners();
		boolean paused = false;
		int returns = 0;
		while(true){
			returns = 0;
			paused = false;
			for(Object o : pivotMap.values()){
				if(o == null){
					try {
						Thread.sleep(100);
						paused = true;
						break;
					} catch (InterruptedException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			}
			if(paused == false){
				break; 
			}
		}
		
		//TODO: Send summary here

		JSONObject returnJson = new JSONObject();
		// Prepare return
		returnJson.put("command", "CLOSE_QUERY");
		returnJson.put("table", source.get("source").toString());

		System.out.println("Edges: " + edges);
		System.out.println("Returned: " + returns);
		System.out.println("Percent: " + (double)((double)returns/(double)edges));

		returnJson.put("runTime", System.currentTimeMillis() - returnStartTime);
		System.out.println("Millseconds Run: " + (System.currentTimeMillis() - returnStartTime));
		session.getAsyncRemote().sendText(returnJson.toJSONString());
	}


	private void closeScanners(){
		this.edgeScanner.close();
	}

	@Override
	public void run() {
		List<Range> ranges;
		try {
			if(this.queryType.equals("analyticResults")){
				getAnalytics();
				return;
			}
			ranges = EdgeTableRangeGenerator.getEdgeRange(
					source.get("source").toString(),
					queryParams.get("sdate").toString(),
					queryParams.get("edate").toString(),
					queryParams.get("direction").toString(),
					queryParams.get("host1").toString(),
					queryParams.get("host2").toString(),
					queryParams.get("host1Port").toString(),
					queryParams.get("host2Port").toString());

			if(this.queryType.equals("liveUpdate")){
				if(source.get("source").toString().equals("Netflow")){
					runStitching(ranges);
				} else {
					runContinuous(ranges);
				}
			}
			if(this.queryType.equals("search")){
				getEdges(ranges);
			}
		} catch (IllegalArgumentException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	private long getEdgeTime(String row){
		int dashPosition = row.indexOf("-", row.lastIndexOf("_"));
		if(dashPosition == -1){
			row = row.substring(row.lastIndexOf("_") + 1);   
		}
		else{
			row = row.substring(row.lastIndexOf("_") + 1, dashPosition);
		}
		try{
			return Long.parseLong(row);
		} catch(NumberFormatException e){
			return 0;
		}
	}

	private boolean filterTime(String s, long startDate, long endDate){
		int dashPosition = s.indexOf("-", s.lastIndexOf("_"));
		if(dashPosition == -1){
			s = s.substring(s.lastIndexOf("_") + 1);   
		}
		else{
			s = s.substring(s.lastIndexOf("_") + 1, dashPosition);
		}
		try{
			long time = Long.parseLong(s);
			if(startDate <= time && endDate >= time){
				return true;
			}
		} catch(NumberFormatException e){
			return false;
		}
		return false;
	}
	private boolean filterTime(String s, long startDate){
		int dashPosition = s.indexOf("-", s.lastIndexOf("_"));
		if(dashPosition == -1){
			s = s.substring(s.lastIndexOf("_") + 1);   
		}
		else{
			s = s.substring(s.lastIndexOf("_") + 1, dashPosition);
		}
		try{
			long time = Long.parseLong(s);
			if(startDate <= time){
				return true;
			}
		} catch(NumberFormatException e){
			return false;
		}
		return false;
	}
	private List<String> getAlertFields(JSONObject json){
		List<String> alertFields = new LinkedList<String>();
		JSONArray af = (JSONArray)(json.get("fields"));
		for(Object s : af){
			JSONObject j = (JSONObject)s;
			if(j.get("alertable").toString().equals("true")){
				alertFields.add(j.get("AccumuloName").toString());
			}
		}
		return alertFields;
	}
}

