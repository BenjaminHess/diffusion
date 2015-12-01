package com.bah.c4s.crowsnest.server;

import java.util.LinkedList;
import java.util.List;
import java.util.Properties;
import java.util.Map.Entry;
import java.util.concurrent.SynchronousQueue;

import org.apache.accumulo.core.client.AccumuloException;
import org.apache.accumulo.core.client.AccumuloSecurityException;
import org.apache.accumulo.core.client.BatchScanner;
import org.apache.accumulo.core.client.Connector;
import org.apache.accumulo.core.client.Instance;
import org.apache.accumulo.core.client.TableNotFoundException;
import org.apache.accumulo.core.client.ZooKeeperInstance;
import org.apache.accumulo.core.client.security.tokens.PasswordToken;
import org.apache.accumulo.core.data.Key;
import org.apache.accumulo.core.data.Range;
import org.apache.accumulo.core.data.Value;
import org.apache.accumulo.core.security.Authorizations;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.websocket.Session;


import javolution.util.FastMap;

import com.bah.c4s.crowsnest.action.Action;
import com.bah.c4s.crowsnest.action.ActionFactory;
import com.bah.c4s.crowsnest.server.pivot.Pivot;
import com.bah.c4s.crowsnest.server.pivot.PivotThread;
import com.bah.c4s.utils.Utilities;

public class QueryRunner {
  private static final Logger LOG = LoggerFactory.getLogger(QueryRunner.class);
  private static final String HDFS_PROPS = "hdfs.properties";
  private static final String INSTANCE_NAME = "accumuloInstanceName";
  private static final String ZK = "accumulozkServerNames";
  private static final String USER = "accumuloUser";
  private static final String PASSWORD = "accumuloPassword";
  private static final int THREADCOUNT = 30;
  private String instanceName;
  private String zkServerNames;
  private String user;
  private String password;
  private Instance inst;
  private Connector conn;
  private SynchronousQueue<Pivot> rangeQueue;
  private FastMap<String,List<Action>> actions = new FastMap<String, List<Action>>();
  
  public QueryRunner() throws AccumuloException, AccumuloSecurityException {
    Properties props = Utilities.getConfig(HDFS_PROPS);
    instanceName = props.getProperty(INSTANCE_NAME);
    zkServerNames = props.getProperty(ZK);
    user = props.getProperty(USER);
    password = props.getProperty(PASSWORD);

    inst = new ZooKeeperInstance(instanceName, zkServerNames);
    conn = inst.getConnector(user, new PasswordToken(password));

    rangeQueue = new SynchronousQueue<Pivot>();
    Authorizations auths = new Authorizations("Belvedere");
    try {
      for (int i = 0; i < THREADCOUNT; i++) {
        Runnable task;
        task = new PivotThread(rangeQueue, conn, auths);
        Thread worker = new Thread(task);
        // We can set the name of the thread
        worker.setName(String.valueOf(i));
        // Start the thread, never call method run() direct
        worker.start();
      }
    } catch (TableNotFoundException e) {
      // TODO Auto-generated catch block
      e.printStackTrace();
    }

    actions = loadActions("ALERT_ANAYLTICS_RECENTLYREGSTERED_20140301-1", "ALERT_ANAYLTICS_RECENTLYREGSTERED_20140301-1~", conn, auths);
    //actions = loadActions("ALERT", "ALERT~", conn, auths);
    
    LOG.info("Ready for queries!");
  }

  public void runQuery(Session session, JSONObject query) {
    JSONArray sources = (JSONArray) query.get("sources");
    JSONObject queryParams = (JSONObject) (query.get("queryParams"));
    List<Thread> threads = new LinkedList<Thread>();
    for (Object s : sources) {
      JSONObject source = (JSONObject) s;
      (new Thread(new SubQueryRunner(session, queryParams, source, this.conn, this.rangeQueue, this.actions,query.get("queryType").toString()))).start();
    }
  }
  public FastMap<String, List<Action>> loadActions(String startRow, String endRow,Connector conn, Authorizations auths){
	  FastMap<String,List<Action>> map = new FastMap<String, List<Action>>();
	  return loadActions(startRow, endRow, conn, auths,map.parallel());
  }
  public FastMap<String, List<Action>> loadActions(String startRow, String endRow,Connector conn, Authorizations auths,FastMap<String,List<Action>> map){
	try {
		BatchScanner scanner = conn.createBatchScanner("Alerts", auths, 5);
		List<Range> ranges = new LinkedList<Range>();
	    ranges.add(new Range(startRow, endRow));
	    scanner.setRanges(ranges);
	    String rowId = "";
	    JSONObject actionJson = new JSONObject();
	    for (Entry<Key, Value> entry : scanner) {
	    	if(!entry.getKey().getRow().toString().equals(rowId) && actionJson.size() > 0){
	    		actionJson.put("accumuloID", rowId);
	    		Action action = ActionFactory.createAction(actionJson);
	    		if(action != null){
	    			List<Action> list = map.get(action.getPrimaryValue()); 
	    			if(list == null){
	    				list = new LinkedList<Action>();
	    				list.add(action);
	    				map.put(action.getPrimaryValue(), list);
	    			} else{
	    				list.add(action);
	    			}
	    		}
	    		actionJson.clear();
	    	}
	    	rowId = entry.getKey().getRow().toString();
	    	if(!entry.getKey().getColumnQualifier().toString().equals("")){
	    		if(actionJson.get("filters") == null){
	    			JSONArray filterArray = new JSONArray();
	    			actionJson.put("filters", filterArray);
	    		}
	    		JSONArray filterArray = (JSONArray) actionJson.get("filters");
	    		JSONObject filter = new JSONObject();
	    		filter.put("field", entry.getKey().getColumnFamily().toString());
	    		filter.put("type", entry.getKey().getColumnQualifier().toString());
	    		filter.put("value", entry.getValue().toString());
	    		filterArray.add(filter);
	    		actionJson.put("filters",filterArray);
	    	} else {
	    	   actionJson.put(entry.getKey().getColumnFamily().toString(), entry.getValue().toString());	
	    	}
	    }
	    actionJson.put("accumuloID", rowId);
	    Action action = ActionFactory.createAction(actionJson);
	    List<Action> list = map.get(action.getPrimaryValue()); 
		if(list == null){
			list = new LinkedList<Action>();
			list.add(action);
			map.put(action.getPrimaryValue(), list);
		} else{
			list.add(action);
		}
	    scanner.close();
	} catch (TableNotFoundException e) {
		// TODO Auto-generated catch block
		e.printStackTrace();
	}
	return map;
	  
  }
}




